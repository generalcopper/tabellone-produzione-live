// Security projection for the approved 12 October ordered warehouse layout.
// Keep presentation in the supplied bundle; only refresh/coverage logic lives here.
const future = (at, now) => typeof at === 'string' && Number.isFinite(Date.parse(at)) && Date.parse(at) >= now;
const snapshotFresh = (data, error, now) => !!data && !error && future(data.expiresAt, now)
  && Number.isFinite(Date.parse(data.generatedAt)) && Date.parse(data.generatedAt) <= now + 10000;
const hasWazuh = data => !!data?.wazuh || [...(data?.checks ?? []), ...(data?.devices ?? []).flatMap(device => device.checks)].some(check => check.id.startsWith('wazuh-'));
const wazuhFresh = (data, now) => !!data?.wazuh && future(data.wazuh.expiresAt, now);
const current = (check, data, now) => !check.id.startsWith('wazuh-') || wazuhFresh(data, now);

export function securityViewState(data, error, now) {
  if (!snapshotFresh(data, error, now)) return 'unknown';
  if (data.devices.some(device => !future(device.expiresAt, now)) || (hasWazuh(data) && !wazuhFresh(data, now))) {
    return data.state === 'down' ? 'down' : 'unknown';
  }
  return data.state;
}

export function securityDetails(data, error, now) {
  const state = securityViewState(data, error, now), live = snapshotFresh(data, error, now);
  const project = (check, valid) => {
    const fresh = valid && current(check, data, now);
    return {...check, state: fresh ? check.state : 'unknown', shownDetail: fresh ? check.detail : 'Dato da aggiornare'};
  };
  const devices = (data?.devices ?? []).map(device => {
    const valid = live && future(device.expiresAt, now);
    const checks = device.checks.map(check => project(check, valid));
    const incomplete = device.checks.some(check => !current(check, data, now));
    return {...device, live: valid, state: valid ? (incomplete && device.state !== 'down' ? 'unknown' : device.state) : 'unknown',
      checks, okCount: checks.filter(check => check.state === 'ok').length};
  });
  const general = (data?.checks ?? []).map(check => project(check, live));
  const all = [...devices.flatMap(device => device.checks), ...general];
  const mail = data?.notifications;
  const notifications = {state: live ? mail?.state ?? 'unknown' : 'unknown',
    active: live && mail?.state === 'ok', recipient: mail?.recipient ?? null, checkedAt: mail?.checkedAt ?? null};
  const coverage = (data?.wazuh
    ? (live && wazuhFresh(data, now) ? 'Wazuh: ' + data.wazuh.connected + '/' + data.wazuh.total + ' dispositivi collegati. ' : 'Wazuh: riepilogo da aggiornare. ')
    : '') + (data?.coverage ?? '');
  return {state, live, devices, general, verified: all.filter(check => check.state === 'ok').length,
    total: all.length, notifications, coverage: coverage || null, generatedAt: data?.generatedAt ?? null, expiresAt: data?.expiresAt ?? null};
}
