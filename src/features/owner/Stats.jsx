import {
  HiCollection,
  HiCurrencyDollar,
  HiOutlineViewGrid,
} from "react-icons/hi";
import Stat from "./Stat";

function Stats({ projects }) {
  const numOfProjects = projects.length;
  const numOfAcceptedProjects = projects.filter((p) => p.status === 2).length;
  const numOfProposals = projects.reduce(
    (acc, curr) => curr.proposals.length + acc,
    0
  );

  return (
    <div className="grid grid-cols-2 gap-8">
      <Stat
        title="پروژه ها"
        value={numOfProjects}
        color="primary"
        icon={<HiOutlineViewGrid className="w-20 h-20" />}
      />
      <Stat
        title="پروژه های واگذار شده"
        value={numOfAcceptedProjects}
        color="green"
        icon={<HiCurrencyDollar className="w-20 h-20" />}
      />
      <Stat
        title="درخواست ها"
        value={numOfProposals}
        color="yellow"
        icon={<HiCollection className="w-20 h-20" />}
      />
    </div>
  );
}

export default Stats;
