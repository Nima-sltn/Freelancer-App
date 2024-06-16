import Table from "../../ui/Table";
import truncateText from "./../../utils/truncateText";
import Modal from "./../../ui/Modal";
import { useState } from "react";
import ChangeProposalStatus from "./ChangeProposalStatus";

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

function ProposalRow({ proposal, index }) {
  const { status, user } = proposal;
  const [open, setOpen] = useState(false);

  return (
    <Table.Row>
      <td>{index + 1}</td>
      <td>{proposal.user.name}</td>
      <td>
        <p>{truncateText(proposal.description, 50)}</p>
      </td>
      <td>{proposal.duration} روز</td>
      <td>{proposal.price}</td>
      <td>
        <div className="w-[6rem]">
          <span className={` badge ${statusStyle[status].className}`}>
            {statusStyle[status].label}
          </span>
        </div>
      </td>
      <td>
        <Modal
          title="تغییر وضعیت درخواست"
          isOpen={open}
          onClose={() => setOpen(false)}>
          <ChangeProposalStatus
            proposalId={proposal._id}
            onClose={() => setOpen(false)}
          />
        </Modal>
        <button onClick={() => setOpen(true)}>تغییر وضعیت</button>
      </td>
    </Table.Row>
  );
}

export default ProposalRow;
