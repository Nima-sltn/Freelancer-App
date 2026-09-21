import useProjects from "../../hooks/useProjects";
import DashboardHeader from "../../ui/DashboardHeader";
import Loading from "../../ui/Loading";
import useProposals from "../proposals/useProposals";
import Stats from "./Stats";
import useUsers from "./useUsers";

function DashboardLayout() {
  const { proposals, isLoading: isLoading1 } = useProposals();
  const { projects, isLoading: isLoading2 } = useProjects();
  const { users, isLoading: isLoading3 } = useUsers();

  if (isLoading1 || isLoading2 || isLoading3) return <Loading />;

  return (
    <div>
      <DashboardHeader />
      <Stats
        users={users.length}
        projects={projects.length}
        proposals={proposals.length}
      />
    </div>
  );
}

export default DashboardLayout;
