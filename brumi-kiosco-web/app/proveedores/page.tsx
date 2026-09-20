    "use client";

    import { useState, useEffect } from "react";
    import { databases, DATABASE_ID, COLLECTIONS } from "../../lib/appwrite";
    import { ID, Query } from "appwrite";
    import { Plus, Phone, Trash2, ArrowLeft, Loader2, Moon, Sun, Pencil, Check, X, MessageSquare } from "lucide-react";
    import Link from "next/link";

    interface Proveedor {
    $id: string;
    nombre: string;
    telefono?: string;
    }

    export default function ProveedoresPage() {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    
    // 1. Estados para el modo edición
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editNombre, setEditNombre] = useState("");
    const [editTelefono, setEditTelefono] = useState("");

    const [modoOscuro, setModoOscuro] = useState(false);

    useEffect(() => {
        const temaGuardado = localStorage.getItem("brumi_tema");
        if (temaGuardado === "oscuro") {
        setModoOscuro(true);
        }
        cargarProveedores();
    }, []);

    const toggleModoOscuro = () => {
        const nuevoEstado = !modoOscuro;
        setModoOscuro(nuevoEstado);
        localStorage.setItem("brumi_tema", nuevoEstado ? "oscuro" : "claro");
    };

    const cargarProveedores = async () => {
        try {
        setCargando(true);
        const res = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PROVEEDORES,
            [Query.orderDesc("$createdAt")]
        );
        setProveedores(res.documents as unknown as Proveedor[]);
        } catch (error) {
        console.error("Error al cargar proveedores:", error);
        } finally {
        setCargando(false);
        }
    };

    // Función para limpiar y formatear el número para WhatsApp
    const limpiarTelefonoParaWpp = (tel: string) => {
        // Quitamos espacios, guiones, paréntesis y signos más
        let numeroLimpio = tel.replace(/\D/g, "");
        
        // Si el número no empieza con 54 (Argentina), se lo agregamos
        if (!numeroLimpio.startsWith("54")) {
        // Si empieza con 0 (ej: 03544...), se lo sacamos antes de agregar el 54
        if (numeroLimpio.startsWith("0")) {
            numeroLimpio = numeroLimpio.substring(1);
        }
        numeroLimpio = "54" + numeroLimpio;
        }
        
        // Aseguramos el 9 para celulares en Argentina si no lo tiene después del 54 (ej: 54 3544...)
        // El formato internacional correcto para WhatsApp en Argentina es 549 + área + número
        if (numeroLimpio.startsWith("54") && !numeroLimpio.startsWith("549") && numeroLimpio.length >= 10) {
        numeroLimpio = "549" + numeroLimpio.substring(2);
        }

        return numeroLimpio;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return;

        try {
        setGuardando(true);
        await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.PROVEEDORES,
            ID.unique(),
            {
            nombre: nombre.trim(),
            telefono: telefono.trim() ? limpiarTelefonoParaWpp(telefono.trim()) : null,
            }
        );

        setNombre("");
        setTelefono("");
        await cargarProveedores();
        } catch (error) {
        console.error("Error al crear proveedor:", error);
        alert("Hubo un error al guardar. Verificá los permisos o la sesión.");
        } finally {
        setGuardando(false);
        }
    };

    const handleEliminar = async (id: string) => {
        if (!confirm("¿Seguro que querés eliminar este proveedor?")) return;
        try {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROVEEDORES, id);
        setProveedores((prev) => prev.filter((p) => p.$id !== id));
        } catch (error) {
        console.error("Error al eliminar:", error);
        }
    };

    // 2. Función para guardar los cambios editados
    const handleActualizar = async (id: string) => {
        if (!editNombre.trim()) return;
        try {
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.PROVEEDORES,
            id,
            {
            nombre: editNombre.trim(),
            telefono: editTelefono.trim() ? limpiarTelefonoParaWpp(editTelefono.trim()) : null,
            }
        );
        
        // Actualizamos la lista local
        setProveedores((prev) =>
            prev.map((p) =>
            p.$id === id ? { ...p, nombre: editNombre.trim(), telefono: editTelefono.trim() ? limpiarTelefonoParaWpp(editTelefono.trim()) : undefined } : p
            )
        );
        setEditandoId(null);
        } catch (error) {
        console.error("Error al actualizar:", error);
        alert("Hubo un error al actualizar el proveedor.");
        }
    };

    return (
        <div className={`min-h-screen p-6 md:p-10 font-sans transition-colors duration-300 ${modoOscuro ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-800"}`}>
        <div className="max-w-4xl mx-auto">
            
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <Link
                href="/"
                className={`flex items-center gap-2 text-sm font-semibold transition mb-2 ${modoOscuro ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}
                >
                <ArrowLeft size={18} /> Volver al Inicio
                </Link>
                <h1 className={`text-2xl font-bold ${modoOscuro ? "text-white" : "text-gray-900"}`}>Gestión de Proveedores</h1>
            </div>

            <button
                onClick={toggleModoOscuro}
                className={`p-2.5 rounded-xl border shadow-sm flex items-center justify-center transition-all ${
                modoOscuro 
                    ? "bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700" 
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
                title="Alternar Modo Oscuro/Claro"
            >
                {modoOscuro ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            </div>

            {/* Formulario para agregar */}
            <div className={`rounded-2xl p-6 shadow-sm border mb-8 ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
            <h2 className={`text-lg font-bold mb-4 ${modoOscuro ? "text-white" : "text-gray-800"}`}>Nuevo Proveedor</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                <label className={`block text-xs font-semibold uppercase mb-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                    Nombre o Empresa *
                </label>
                <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Arcor, Distribuidora San Luis..."
                    className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                />
                </div>

                <div>
                <label className={`block text-xs font-semibold uppercase mb-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                    Teléfono / WhatsApp
                </label>
                <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. 3544-123456"
                    className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                />
                </div>

                <div className="flex items-end">
                <button
                    type="submit"
                    disabled={guardando}
                    className={`w-full font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm shadow-sm ${modoOscuro ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                    {guardando ? (
                    <Loader2 size={18} className="animate-spin" />
                    ) : (
                    <>
                        <Plus size={18} /> Guardar
                    </>
                    )}
                </button>
                </div>
            </form>
            </div>

            {/* Listado */}
            <div className={`rounded-2xl p-6 shadow-sm border ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
            <h2 className={`text-lg font-bold mb-4 ${modoOscuro ? "text-white" : "text-gray-800"}`}>Mis Proveedores</h2>

            {cargando ? (
                <div className="flex justify-center py-8 text-gray-400">
                <Loader2 size={32} className="animate-spin" />
                </div>
            ) : proveedores.length === 0 ? (
                <p className={`text-center py-8 text-sm ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>
                Todavía no cargaste ningún proveedor. ¡Agregá el primero arriba!
                </p>
            ) : (
                <div className={`divide-y ${modoOscuro ? "divide-gray-800" : "divide-gray-100"}`}>
                {proveedores.map((p) => (
                    <div key={p.$id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {editandoId === p.$id ? (
                        /* 3. Vista de Modo Edición */
                        <div className="flex flex-1 flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            className={`flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${modoOscuro ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                            placeholder="Nombre de la empresa"
                        />
                        <input
                            type="text"
                            value={editTelefono}
                            onChange={(e) => setEditTelefono(e.target.value)}
                            className={`w-full sm:w-40 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${modoOscuro ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                            placeholder="Teléfono"
                        />
                        </div>
                    ) : (
                        /* Vista Normal */
                        <div className="flex-1">
                        <p className={`font-semibold ${modoOscuro ? "text-gray-200" : "text-gray-800"}`}>{p.nombre}</p>
                        {p.telefono && (
                            <div className="flex items-center gap-3 mt-1">
                            <p className={`text-xs flex items-center gap-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                                <Phone size={12} /> {p.telefono}
                            </p>
                            <a
                                href={`https://wa.me/${p.telefono}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1 font-semibold bg-green-500/10 px-2 py-0.5 rounded-md transition"
                                title="Abrir chat de WhatsApp"
                            >
                                <MessageSquare size={12} /> Enviar WhatsApp
                            </a>
                            </div>
                        )}
                        </div>
                    )}

                    {/* 4. Botones Laterales */}
                    <div className="flex items-center justify-end gap-1">
                        {editandoId === p.$id ? (                     <>                         <button                         onClick={() => handleActualizar(p.$id)}
                            className="p-2 transition text-green-500 hover:text-green-400"
                            title="Guardar cambios"
                            >
                            <Check size={18} />
                            </button>
                            <button
                            onClick={() => setEditandoId(null)}
                            className="p-2 transition text-red-500 hover:text-red-400"
                            title="Cancelar"
                            >
                            <X size={18} />
                            </button>
                        </>
                        ) : (
                        <>
                            <button
                            onClick={() => {
                                setEditandoId(p.$id);
                                setEditNombre(p.nombre);
                                setEditTelefono(p.telefono || "");
                            }}
                            className={`p-2 transition ${modoOscuro ? "text-gray-500 hover:text-blue-400" : "text-gray-400 hover:text-blue-600"}`}
                            title="Editar proveedor"
                            >
                            <Pencil size={18} />
                            </button>
                            <button
                            onClick={() => handleEliminar(p.$id)}
                            className={`p-2 transition ${modoOscuro ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-600"}`}
                            title="Eliminar proveedor"
                            >
                            <Trash2 size={18} />
                            </button>
                        </>
                        )}
                    </div>

                    </div>
                ))}
                </div>
            )}
            </div>

        </div>
        </div>
    );
    }