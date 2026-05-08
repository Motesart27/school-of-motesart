function avg(students, key) {
  if (!students.length) return 0
  const total = students.reduce((sum, student) => sum + (Number(student.signalContext?.derivedScores?.[key]) || 0), 0)
  return Math.round(total / students.length)
}

function topConcept(students) {
  const counts = {}
  students.forEach(student => {
    const concept = student.signalContext?.lessonContext?.currentConcept || 'unknown'
    counts[concept] = (counts[concept] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
}

function Tile({ label, value, color = '#f97316' }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.045)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:14 }}>
      <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:.5 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:900, color, marginTop:5 }}>{value}</div>
    </div>
  )
}

export default function TamiAdminBrief({ students = [] }) {
  const list = Array.isArray(students) ? students : []
  const p0Students = list.filter(student => student.tamiDecision?.priority === 'P0')
  const p1Students = list.filter(student => student.tamiDecision?.priority === 'P1')
  const p0Count = p0Students.length
  const p1Count = p1Students.length
  const affected = [...p0Students, ...p1Students]
  const headline = p0Count > 0
    ? `T.A.M.i has flagged ${p0Count} student(s) requiring immediate attention.`
    : p1Count > 0
      ? `T.A.M.i has flagged ${p1Count} student(s) for teacher review.`
      : 'Platform nominal. All student signals within expected range.'

  return (
    <div className="card" style={{ borderColor:'rgba(249,115,22,0.22)' }}>
      <div className="card-hdr">
        <div>
          <div className="card-title">T.A.M.i Platform Brief</div>
          <div className="card-sub">{headline}</div>
        </div>
        <span className="pill p-or2">Read-only</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10 }}>
        <Tile label="Total Students" value={list.length} />
        <Tile label="P0 Alerts" value={p0Count} color="#ef4444" />
        <Tile label="P1 Alerts" value={p1Count} color="#f59e0b" />
        <Tile label="Avg Confusion" value={avg(list, 'confusionScore')} color="#fb923c" />
      </div>
      {p0Count > 0 && (
        <div style={{ marginTop:12, color:'#fed7aa', fontSize:12, fontWeight:700 }}>
          Most affected concept: {topConcept(affected)}
        </div>
      )}
    </div>
  )
}
