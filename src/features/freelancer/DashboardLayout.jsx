import Stats from "./Stats";
import Loading from "./../../ui/Loading";
import useProposals from "../proposals/useProposals";
import DashboardHeader from "../../ui/DashboardHeader";

function DashboardLayout() {
  const { proposals, isLoading } = useProposals();
  if (isLoading) return <Loading />;

  return (
    <div>
      <DashboardHeader />
      <Stats proposals={proposals} />
    </div>
  );
}

export default DashboardLayout;
