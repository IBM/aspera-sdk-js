import './Views.scss';
import readme from '../../../README.md?raw';
import MarkdownIt from 'markdown-it';

export default function Home() {
  const converter = new MarkdownIt();
  let htmlData = converter.render(readme);

  return <div className="markdown-render" dangerouslySetInnerHTML={{__html: htmlData}} />;
};
