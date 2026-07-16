export default function Skeleton({ label = 'Loading content', lines = 3, className = '' }) {
  return (
    <div className={`som-skeleton-region ${className}`.trim()} role="status" aria-label={label}>
      <div aria-hidden="true" className="som-skeleton">
        {Array.from({ length: lines }, (_, index) => <span key={index} />)}
      </div>
    </div>
  )
}
