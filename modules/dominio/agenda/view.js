/**
 * agenda/view.js - render del dominio Agenda.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

/**
 * Renderiza el placeholder de la Agenda en `#panel-agenda`.
 * Sub-tarea 1: placeholder. El calendario real llega en sub-tareas 3 y 4.
 * No-op si el contenedor no existe.
 */
export function renderAgenda() {
  const el = document.getElementById('panel-agenda');
  if (!el) return;

  el.innerHTML = `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">📅</p>
      <p class="empty-state__title">Tu Agenda está en camino</p>
      <p class="empty-state__desc">
        Pronto vas a ver tus compromisos del mes en un calendario visual:
        gastos fijos, deudas y vencimientos próximos, todos en un solo lugar.
      </p>
      <p class="empty-state__tip">
        💡 Mientras tanto, podés gestionar tus compromisos en la sección
        <a href="#compromisos" class="link">Compromisos</a>.
      </p>
    </div>`;
}
