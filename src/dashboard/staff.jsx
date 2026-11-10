import EntityPage from './EntityPage'

const config = { title: 'Staff', singular: 'staff member', table: 'staff', description: 'Keep your team details, roles, and joining dates organised.', empty: 'No staff members added yet.', fields: [{ key: 'name', label: 'Staff name', type: 'text', required: true }, { key: 'phone', label: 'Phone number', type: 'tel' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'role', label: 'Role', type: 'text' }, { key: 'salary', label: 'Salary', type: 'number', min: 0 }, { key: 'joined_at', label: 'Joined date', type: 'date' }], columns: [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'phone', label: 'Phone' }, { key: 'joined_at', label: 'Joined' }] }

export default function Staff() { return <EntityPage config={config} /> }