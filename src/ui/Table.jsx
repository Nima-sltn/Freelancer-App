function Table({ children }) {
  return (
    <div className="bg-secondary-0 overflow-x-auto">
      <table>{children}</table>
    </div>
  );
}

export default Table;

function tableHeader({ children }) {
  return (
    <thead>
      <tr className="title-row">{children}</tr>
    </thead>
  );
}

function tableBody({ children }) {
  return <tbody>{children}</tbody>;
}

function tableRow({ children }) {
  return <tr>{children}</tr>;
}

Table.Header = tableHeader;
Table.Body = tableBody;
Table.Row = tableRow;
