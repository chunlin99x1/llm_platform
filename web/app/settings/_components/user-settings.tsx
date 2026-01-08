"use client";

import { useState, useEffect } from "react";
import {
    Button,
    Input,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Chip,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    User as UserAvatar,
    Select,
    SelectItem
} from "@heroui/react";
import { Plus, Trash2, Edit2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface User {
    id: number;
    email: string;
    name?: string;
    role: string;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
}

export default function UserSettings() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [formData, setFormData] = useState({
        email: "",
        name: "",
        password: "",
        role: "user",
        is_active: true,
    });

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/users`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            toast.error("Failed to load users");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (onClose: () => void) => {
        try {
            if (!editingUser && !formData.password) {
                toast.error("Password is required for new users");
                return;
            }

            const url = editingUser
                ? `${process.env.NEXT_PUBLIC_API_URL}/settings/users/${editingUser.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/settings/users`;

            const method = editingUser ? "PUT" : "POST";

            const body: any = {
                name: formData.name,
                role: formData.role,
                is_active: formData.is_active,
            };

            if (!editingUser) {
                body.email = formData.email;
                body.password = formData.password;
            } else if (formData.password) {
                body.password = formData.password;
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Operation failed");
            }

            toast.success(editingUser ? "User updated" : "User created");
            fetchUsers();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/users/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("User deleted");
            fetchUsers();
        } catch (error) {
            toast.error("Failed to delete user");
        }
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            name: user.name || "",
            password: "",
            role: user.role,
            is_active: user.is_active,
        });
        onOpen();
    };

    const openCreate = () => {
        setEditingUser(null);
        setFormData({
            email: "",
            name: "",
            password: "",
            role: "user",
            is_active: true,
        });
        onOpen();
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">用户管理</h2>
                    <p className="text-sm text-default-500">管理系统用户及权限。</p>
                </div>
                <Button color="primary" startContent={<Plus size={18} />} onPress={openCreate}>
                    添加用户
                </Button>
            </div>

            <Table aria-label="Users table">
                <TableHeader>
                    <TableColumn>用户</TableColumn>
                    <TableColumn>角色</TableColumn>
                    <TableColumn>状态</TableColumn>
                    <TableColumn>最后登录</TableColumn>
                    <TableColumn>操作</TableColumn>
                </TableHeader>
                <TableBody isLoading={isLoading} items={users}>
                    {(item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <UserAvatar
                                    name={item.name || "User"}
                                    description={item.email}
                                    avatarProps={{ radius: "lg", src: `https://i.pravatar.cc/150?u=${item.id}` }}
                                />
                            </TableCell>
                            <TableCell>
                                <Chip size="sm" variant="flat" color={item.role === 'admin' ? "secondary" : "default"}>
                                    {item.role === 'admin' ? '管理员' : '普通用户'}
                                </Chip>
                            </TableCell>
                            <TableCell>
                                <Chip size="sm" variant="dot" color={item.is_active ? "success" : "danger"}>
                                    {item.is_active ? "Active" : "Inactive"}
                                </Chip>
                            </TableCell>
                            <TableCell>
                                <span className="text-tiny text-default-400">
                                    {item.last_login_at ? format(new Date(item.last_login_at), "yyyy-MM-dd HH:mm") : "Never"}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(item)}>
                                        <Edit2 size={16} />
                                    </Button>
                                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(item.id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{editingUser ? "编辑用户" : "添加用户"}</ModalHeader>
                            <ModalBody>
                                <Input
                                    label="邮箱"
                                    placeholder="user@example.com"
                                    value={formData.email}
                                    onValueChange={(v) => setFormData({ ...formData, email: v })}
                                    isDisabled={!!editingUser}
                                />

                                <Input
                                    label="姓名 (可选)"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onValueChange={(v) => setFormData({ ...formData, name: v })}
                                />

                                <Input
                                    label={editingUser ? "重置密码 (留空不修改)" : "密码"}
                                    type="password"
                                    value={formData.password}
                                    onValueChange={(v) => setFormData({ ...formData, password: v })}
                                />

                                <Select
                                    label="角色"
                                    selectedKeys={[formData.role]}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <SelectItem key="user" value="user">普通用户</SelectItem>
                                    <SelectItem key="admin" value="admin">管理员</SelectItem>
                                </Select>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm">账号状态:</span>
                                    <Chip
                                        className="cursor-pointer"
                                        color={formData.is_active ? "success" : "danger"}
                                        variant="flat"
                                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    >
                                        {formData.is_active ? "Active" : "Inactive"}
                                    </Chip>
                                </div>

                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>取消</Button>
                                <Button color="primary" onPress={() => handleSubmit(onClose)}>
                                    保存
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
