import ProposalTable from "../features/proposals/ProposalTable";

function Proposals() {
  return (
    <div>
      <h1 className="text-xl font-black text-secondary-700 mb-8">
        لیست پروپوزال ها
      </h1>
      <ProposalTable />
    </div>
  );
}

export default Proposals;
