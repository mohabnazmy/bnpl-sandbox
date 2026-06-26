import { useParams, Link } from 'react-router-dom';
import { useAgreement } from '../../hooks/useAgreements';
import { Card } from '../../ui/Card';
import { Money } from '../../ui/Money';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: detail, error } = useAgreement(id);

  if (error) {
    return (
      <div className="detail">
        <div className="alert alert-error">{error}</div>
        <Link to="/" className="btn btn-ghost">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (!detail) {
    return <div className="detail muted">Loading agreement…</div>;
  }

  const { agreement, installments } = detail;

  return (
    <div className="detail">
      <Link to="/" className="back-link">
        ← Back to dashboard
      </Link>

      <header className="detail-head">
        <div>
          <h1 className="page-title">{agreement.merchant}</h1>
          <p className="muted">
            Created {formatDate(agreement.createdAt)} · {agreement.months}-month plan
          </p>
        </div>
        <span className={`badge badge-${agreement.status}`}>{agreement.status}</span>
      </header>

      <div className="summary-grid">
        <Card className="summary-card">
          <span className="summary-label">Principal</span>
          <span className="summary-value">
            <Money amount={agreement.principal} />
          </span>
        </Card>
        <Card className="summary-card">
          <span className="summary-label">Total payable</span>
          <span className="summary-value">
            <Money amount={agreement.totalPayable} />
          </span>
        </Card>
        <Card className="summary-card">
          <span className="summary-label">Months</span>
          <span className="summary-value">{agreement.months}</span>
        </Card>
      </div>

      <section className="section">
        <h2 className="section-title">Installment schedule</h2>
        <Card className="table-card">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Due date</th>
                <th className="num">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => (
                <tr key={inst.id}>
                  <td>{inst.seq}</td>
                  <td>{formatDate(inst.dueDate)}</td>
                  <td className="num">
                    <Money amount={inst.amount} />
                  </td>
                  <td>
                    <span className={`badge badge-${inst.status}`}>{inst.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
