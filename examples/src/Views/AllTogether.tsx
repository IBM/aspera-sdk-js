import './Views.scss';
import { tabItems } from '../App';

export default function AllTogether() {
  const getItem = (item: {route: string; name: string; component: React.ReactNode}): React.ReactNode => {
    return (
      <div className="item-area" key={item.route}>
        {item.component}
      </div>
    );
  }

  const rows = tabItems.filter(item => !!item.row).map(item => item.row).sort();

  return (
    <div className="example-pages all-together">
      {[...new Set(rows)].map(row => {
        return (
        <div className={`item-row ${row === 1 ? 'flat-space' : ''}`} key={row}>
          {tabItems.filter(item => item.row === row).map(item => getItem(item))}
        </div>
        );
      })}
    </div>
  );
};
