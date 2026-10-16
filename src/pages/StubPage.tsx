import "./StubPage.css";

export function StubPage({ kicker, titulo }: { kicker: string; titulo: string }) {
  return (
    <div className="stub-page">
      <div className="stub-header">
        <div className="kicker">{kicker}</div>
        <h2>{titulo}</h2>
      </div>
      <div className="stub-body">
        <div className="stub-card">
          <div className="stub-card-title">Tela em definição</div>
          <div className="text-muted">Fora do foco desta leva do protótipo.</div>
        </div>
      </div>
    </div>
  );
}
