import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAgreementList } from '../hooks/useAgreements';
import { Card } from '../components/Card';
import { Money, formatMoney } from '../components/Money';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: agreements, error } = useAgreementList();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="page-title">Hello{user ? `, ${user.name}` : ''} 👋</h1>
          {user && (
            <p className="credit-line">
              Credit limit: <strong>{formatMoney(user.creditLimit)}</strong>
            </p>
          )}
        </div>
        <Link to="/checkout" className="btn btn-primary">
          + New purchase
        </Link>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="section">
        <h2 className="section-title">Your plans</h2>

        {agreements === null && <p className="muted">Loading your agreements…</p>}

        {agreements !== null && agreements.length === 0 && (
          <Card className="empty-state">
            <p className="empty-title">No plans yet</p>
            <p className="muted">
              When you split a purchase into installments, it will show up here.
            </p>
            <Link to="/checkout" className="btn btn-primary">
              Start a purchase
            </Link>
          </Card>
        )}

        {agreements !== null && agreements.length > 0 && (
          <div className="agreement-grid">
            {agreements.map((a) => (
              <Link key={a.id} to={`/agreements/${a.id}`} className="plain-link">
                <Card className="agreement-card">
                  <div className="agreement-card-head">
                    <span className="agreement-merchant">{a.merchant}</span>
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  </div>
                  <div className="agreement-principal">
                    <Money amount={a.principal} />
                  </div>
                  <div className="agreement-meta muted">
                    {a.months} months · total <Money amount={a.totalPayable} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
