import type { Meta, StoryObj } from "@storybook/react-vite";
import { Collection } from "react-aria-components";

import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "./table";

const meta = {
	title: "Components/Table",
	component: Table,
	tags: ["autodocs"],
	argTypes: {
		striped: { control: "boolean" },
		grid: { control: "boolean" },
	},
	args: {},
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

const columns = [
	{ id: "name", name: "Name" },
	{ id: "role", name: "Role" },
	{ id: "status", name: "Status" },
	{ id: "joined", name: "Joined" },
];

const rows = [
	{ id: 1, name: "Jane Smith", role: "Admin", status: "Active", joined: "Jan 2023" },
	{ id: 2, name: "John Doe", role: "Editor", status: "Inactive", joined: "Mar 2023" },
	{ id: 3, name: "Alice Johnson", role: "Viewer", status: "Active", joined: "Jun 2023" },
	{ id: 4, name: "Bob Williams", role: "Editor", status: "Active", joined: "Sep 2023" },
];

export const Default: Story = {
	args: {},
	render(props) {
		return (
			<Table {...props}>
				<TableHeader columns={columns}>
					{(column) => <TableColumn id={column.id}>{column.name}</TableColumn>}
				</TableHeader>
				<TableBody items={rows}>
					{(row) => (
						<TableRow id={row.id}>
							<TableCell>{row.name}</TableCell>
							<TableCell>{row.role}</TableCell>
							<TableCell>{row.status}</TableCell>
							<TableCell>{row.joined}</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		);
	},
};

export const Striped: Story = {
	args: { striped: true },
	render(props) {
		return (
			<Table {...props}>
				<TableHeader columns={columns}>
					{(column) => <TableColumn id={column.id}>{column.name}</TableColumn>}
				</TableHeader>
				<TableBody items={rows}>
					{(row) => (
						<TableRow id={row.id}>
							<TableCell>{row.name}</TableCell>
							<TableCell>{row.role}</TableCell>
							<TableCell>{row.status}</TableCell>
							<TableCell>{row.joined}</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		);
	},
};

export const WithGrid: Story = {
	args: { grid: true },
	render(props) {
		return (
			<Table {...props}>
				<TableHeader columns={columns}>
					{(column) => <TableColumn id={column.id}>{column.name}</TableColumn>}
				</TableHeader>
				<TableBody items={rows}>
					{(row) => (
						<TableRow id={row.id}>
							<TableCell>{row.name}</TableCell>
							<TableCell>{row.role}</TableCell>
							<TableCell>{row.status}</TableCell>
							<TableCell>{row.joined}</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		);
	},
};

export const Empty: Story = {
	args: {},
	render(props) {
		return (
			<Table {...props}>
				<TableHeader columns={columns}>
					{(column) => <TableColumn id={column.id}>{column.name}</TableColumn>}
				</TableHeader>
				<TableBody items={[]}>{() => <TableRow id="empty" />}</TableBody>
			</Table>
		);
	},
};

interface ExpandableRow {
	id: string;
	name: string;
	role: string;
	status: string;
	joined: string;
	history: Array<Omit<ExpandableRow, "history">>;
}

const expandableRows: Array<ExpandableRow> = [
	{
		id: "jane",
		name: "Jane Smith",
		role: "Admin",
		status: "Active",
		joined: "Jan 2023",
		history: [
			{ id: "editor", name: "Previously", role: "Editor", status: "Active", joined: "Mar 2021" },
			{ id: "viewer", name: "Previously", role: "Viewer", status: "Active", joined: "Jun 2020" },
		],
	},
	{
		id: "john",
		name: "John Doe",
		role: "Editor",
		status: "Inactive",
		joined: "Mar 2023",
		history: [],
	},
	{
		id: "alice",
		name: "Alice Johnson",
		role: "Viewer",
		status: "Active",
		joined: "Jun 2023",
		history: [],
	},
];

/**
 * Set `treeColumn` to the row header column and nest a `Collection` of child rows inside a row to
 * make it expandable. Cells in the tree column render a chevron for rows with children and a spacer
 * otherwise.
 */
export const ExpandableRows: Story = {
	args: {},
	render(props) {
		return (
			<Table {...props} defaultExpandedKeys={["jane"]} treeColumn="name">
				<TableHeader columns={columns}>
					{(column) => (
						<TableColumn id={column.id} isRowHeader={column.id === "name"}>
							{column.name}
						</TableColumn>
					)}
				</TableHeader>
				<TableBody items={expandableRows}>
					{(row) => (
						<TableRow id={row.id}>
							<TableCell>{row.name}</TableCell>
							<TableCell>{row.role}</TableCell>
							<TableCell>{row.status}</TableCell>
							<TableCell>{row.joined}</TableCell>
							<Collection items={row.history}>
								{(entry) => (
									<TableRow id={entry.id} className="text-muted-fg">
										<TableCell>{entry.name}</TableCell>
										<TableCell>{entry.role}</TableCell>
										<TableCell>{entry.status}</TableCell>
										<TableCell>{entry.joined}</TableCell>
									</TableRow>
								)}
							</Collection>
						</TableRow>
					)}
				</TableBody>
			</Table>
		);
	},
};
