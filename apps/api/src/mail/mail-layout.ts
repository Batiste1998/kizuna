/** Shared HTML shell for all transactional emails (auth flows + notifications). */
export function mailLayout(title: string, body: string, cta?: { url: string; label: string }) {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#1b1b19">${title}</h2>
    <p style="color:#44443f;line-height:1.5">${body}</p>
    ${
      cta
        ? `<p><a href="${cta.url}" style="display:inline-block;background:#2e9e82;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${cta.label}</a></p>
    <p style="color:#76766f;font-size:12px">Ou copiez ce lien : ${cta.url}</p>`
        : ''
    }
    <p style="color:#76766f;font-size:12px;margin-top:24px">Kizuna — suivi d'alternance</p>
  </div>`;
}
