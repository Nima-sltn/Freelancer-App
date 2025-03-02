import { useState } from "react";
import Modal from "../../ui/Modal";
import Table from "../../ui/Table";
import toLocalDateShort from "../../utils/toLocalDateShort";
import { toPersianNumbersWithComma } from "../../utils/toPersianNumbers";
import truncateText from "../../utils/truncateText";
import { HiEye, HiOutlineTrash } from "react-icons/hi";
import { TbPencilMinus } from "react-icons/tb";
import ConfirmDelete from "../../ui/ConfirmDelete";
import useRemoveProject from "./useRemoveProject";
import CreateProjectForm from "./CreateProjectForm";
import ToggleProjectStatus from "./ToggleProjectStatus";
import { Link } from "react-router-dom";

function ProjectRow({ project, index }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { removeProject } = useRemoveProject();

  return (
    <Table.Row key={project._id}>
      <td>{index + 1}</td>
      <td>{truncateText(project.title, 30)}</td>
      <td>{project.category.title}</td>
      <td>{toPersianNumbersWithComma(project.budget)}</td>
      <td>{toLocalDateShort(project.deadline)}</td>
      <td>
        <div className="flex flex-wrap items-center gap-2 max-w-[200px]">
          {project.tags.map((tag) => (
            <span key={tag} className="badge badge--secondary">
              {tag}
            </span>
          ))}
        </div>
      </td>
      <td>{project.freelancer?.name || "-"}</td>
      <td>
        <ToggleProjectStatus project={project} />
      </td>
      <td>
        <div className="flex items-center gap-x-4">
          <button onClick={() => setIsEditOpen(true)}>
            <TbPencilMinus className="h-5 w-5 text-primary-900" />
          </button>
          <Modal
            title={`ویرایش ${project.title}`}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}>
            <CreateProjectForm
              projectToEdit={project}
              onClose={() => setIsEditOpen(false)}
            />
          </Modal>

          <button onClick={() => setIsDeleteOpen(true)}>
            <HiOutlineTrash className="h-5 w-5 text-error" />
          </button>
          <Modal
            title={`حذف ${project.title}`}
            isOpen={isDeleteOpen}
            onClose={() => setIsDeleteOpen(false)}>
            <ConfirmDelete
              resourceName={project.title}
              onClose={() => setIsDeleteOpen(false)}
              onConfirm={() =>
                removeProject(project._id, {
                  onSuccess: () => {
                    setIsDeleteOpen(false);
                  },
                })
              }
              disabled={false}
            />
          </Modal>
        </div>
      </td>
      <td>
        <Link to={project._id} className="flex justify-center">
          <HiEye className="h-5 w-5 text-primary-800" />
        </Link>
      </td>
    </Table.Row>
  );
}

export default ProjectRow;
