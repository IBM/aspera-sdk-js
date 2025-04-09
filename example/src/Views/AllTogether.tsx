import './Views.scss';
import { tabItems } from '../App';

export default function AllTogether() {
  const allItems = tabItems.filter(item => !item.hideFromAll);

  return (
    <div className="example-pages all-together">
      {allItems.map(item => {
        return (
          <div className="item-area" key={item.route}>
            <h2 className="item-area--header">{item.name}</h2>
            {item.component}
          </div>
        );
      })}
    </div>
  );
};
