import Table from "../../ui/Table";
import truncateText from "./../../utils/truncateText";
import {
  toPersianNumbers,
  toPersianNumbersWithComma,
} from "./../../utils/toPersianNumbers";
import type { Proposal } from "../../types";

const statusStyle = [
  {
    label: "رد شده",
    className: "badge--danger",
  },
  {
    label: "در انتظار تایید",
    className: "badge--secondary",
  },
  {
    label: "تایید شده",
    className: "badge--success",
  },
];

interface ProposalRowProps {
  proposal: Proposal;
  index: number;
}

function ProposalRow({ proposal, index }: ProposalRowProps) {
  const { description, duration, price, status } = proposal;

  return (
    <Table.Row>
      <td>{index + 1}</td>
      <td>{truncateText(description, 60)}</td>
      <td>{toPersianNumbers(duration)} روز</td>
      <td>{toPersianNumbersWithComma(price)}</td>
      <td>
        <span className={` badge ${statusStyle[status].className}`}>
          {statusStyle[status].label}
        </span>
      </td>
    </Table.Row>
  );
}

export default ProposalRow;
