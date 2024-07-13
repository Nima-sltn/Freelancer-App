import { MdAssignmentAdd } from "react-icons/md";
import truncateText from "./../../../utils/truncateText";
import { toPersianNumbersWithComma } from "./../../../utils/toPersianNumbers";
import toLocalDateShort from "./../../../utils/toLocalDateShort";
import Table from "../../../ui/Table";
import { useState } from "react";
import Modal from "./../../../ui/Modal";
import CreateProposal from "../../proposals/CreateProposal";

const projectStatus = {
  OPEN: {
    label: "باز",
    className: "badge--success",
  },
  CLOSED: {
    label: "بسته",
    className: "badge--danger",
  },
};

function ProjectRow({ project, index }) {
  const { status, title, budget, deadline } = project;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Table.Row>
      <td>{index + 1}</td>
      <td>{truncateText(title, 30)}</td>
      <td>{toPersianNumbersWithComma(budget)}</td>
      <td>{toLocalDateShort(deadline)}</td>
      <td>
        <span className={`badge ${projectStatus[status].className}`}>
          {projectStatus[status].label}
        </span>
      </td>
      <td>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={`ثبت درخواست برای ${title}`}>
          <CreateProposal
            projectId={project._id}
            onClose={() => setIsOpen(false)}
          />
        </Modal>
        <button onClick={() => setIsOpen(true)}>
          <MdAssignmentAdd className="w-5 h-5 text-primary-900" />
        </button>
      </td>
    </Table.Row>
  );
}

export default ProjectRow;
