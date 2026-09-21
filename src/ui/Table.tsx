import type { ReactNode } from "react";

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="bg-secondary-0 overflow-x-auto">
      <table>{children}</table>
    </div>
  );
}

export default Table;

function tableHeader({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="title-row">{children}</tr>
    </thead>
  );
}

function tableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

function tableRow({ children }: { children: ReactNode }) {
  return <tr>{children}</tr>;
}

Table.Header = tableHeader;
Table.Body = tableBody;
Table.Row = tableRow;
