import UsersTable from "../features/admin/users/UsersTable";

function Users() {
  return (
    <div>
      <h1 className="text-xl font-black text-secondary-700 mb-8">کاربران</h1>
      <UsersTable />
    </div>
  );
}

export default Users;
