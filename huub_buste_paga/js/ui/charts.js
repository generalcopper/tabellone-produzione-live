export function renderDonut(canvas, { matched = 0, unmatched = 0 } = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const total = Math.max(1, matched + unmatched);
  const matchedAngle = (matched / total) * Math.PI * 2;
  const size = Math.min(canvas.clientWidth, canvas.clientHeight);
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = Math.min(size / 2 - 6, 60);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f2f4f8";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0a84ff";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + matchedAngle);
  ctx.closePath();
  ctx.fill();

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "#0c101a";
  ctx.font = "bold 12px 'Inter', system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${Math.round((matched / total) * 100)}%`, cx, cy);
}
