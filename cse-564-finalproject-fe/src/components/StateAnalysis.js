export default function StateAnalysis({ data }) {
  if (!data) {
    return <div style={{ padding: '20px', color: '#888' }}>
      No data for this state.
    </div>;
  }
  return (
    <div style={{ padding: '20px', color: '#eee' }}>
      <p><strong>State:</strong> {data.state}</p>
      <p><strong>Total Crashes:</strong> {data.count.toLocaleString()}</p>
    </div>
  );
}
