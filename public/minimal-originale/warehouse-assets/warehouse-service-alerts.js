// User request 20 October 2026: exclude Motore IG from this dashboard's
// problem indications. The authenticated snapshot and its proofs remain intact;
// this display policy does not stop Instagram or change its backend monitoring.
export function monitoredServices(services = []) {
  return services.filter(service => service.id !== "instagram");
}
