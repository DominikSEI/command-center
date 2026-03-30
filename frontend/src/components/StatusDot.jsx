export default function StatusDot({ status }) {
  const cls = {
    online: 'status-dot status-online',
    warning: 'status-dot status-warning',
    down: 'status-dot status-down',
  }[status] ?? 'status-dot status-unknown'

  return <span className={cls} />
}
