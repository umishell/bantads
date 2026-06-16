export async function integrationReboot (upstreams, profile = 'full') {
  const q = profile === 'full' ? '' : `?profile=${encodeURIComponent(profile)}`
  const steps = [
  { name: 'ms-gerente', url: `${upstreams.gerente}/gerentes/integration/reboot${q}`, method: 'POST' },
  { name: 'ms-cliente', url: `${upstreams.cliente}/clientes/integration/reboot${q}`, method: 'POST' },
  { name: 'ms-conta', url: `${upstreams.conta}/contas/integration/reboot${q}`, method: 'POST' },
  { name: 'ms-auth', url: `${upstreams.auth}/auth/reboot`, method: 'GET' },
  ]
  const results = []
  for (const step of steps) {
    const res = await fetch(step.url, { method: step.method })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`${step.name} reboot HTTP ${res.status}: ${text.slice(0, 500)}`)
    }
    results.push({ service: step.name, status: res.status })
  }
  return { profile, results }
}
