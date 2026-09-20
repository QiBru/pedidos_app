    "use client";

    import { useState, useEffect } from "react";
    import { databases, DATABASE_ID, COLLECTIONS } from "../../lib/appwrite";
    import { ID, Query } from "appwrite";
    import { Plus, Trash2, ArrowLeft, Loader2, Upload, FileSpreadsheet, Search, CheckCircle, Moon, Sun, Pencil, Check, X } from "lucide-react";
    import Link from "next/link";

    interface Proveedor {
    $id: string;
    nombre: string;
    }

    interface Producto {
    $id: string;
    nombre: string;
    precio: number;
    unidad_medida?: string;
    proveedor_id: string;
    }

    export default function ProductosPage() {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");
    const [productos, setProductos] = useState<Producto[]>([]);
    
    // Carga manual
    const [nombreManual, setNombreManual] = useState("");
    const [precioManual, setPrecioManual] = useState("");
    const [unidadManual, setUnidadManual] = useState<"un" | "kg">("un");
    
    // Importación masiva
    const [textoMasivo, setTextoMasivo] = useState("");
    const [modoMasivo, setModoMasivo] = useState(false);
    
    const [busqueda, setBusqueda] = useState("");
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState("");

    // Estados para Edición
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editNombre, setEditNombre] = useState("");
    const [editPrecio, setEditPrecio] = useState("");
    const [editUnidad, setEditUnidad] = useState<"un" | "kg">("un");

    // Estado del Modo Oscuro
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

    useEffect(() => {
        if (proveedorSeleccionado) {
        cargarProductos(proveedorSeleccionado);
        } else {
        setProductos([]);
        }
    }, [proveedorSeleccionado]);

    const cargarProveedores = async () => {
        try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROVEEDORES, [
            Query.orderAsc("nombre"),
        ]);
        const docs = res.documents as unknown as Proveedor[];
        setProveedores(docs);
        if (docs.length > 0) setProveedorSeleccionado(docs[0].$id);
        } catch (error) {
        console.error("Error al cargar proveedores:", error);
        }
    };

    const cargarProductos = async (provId: string) => {
        try {
        setCargando(true);
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTOS, [
            Query.equal("proveedor_id", provId),
            Query.limit(200),
        ]);
        setProductos(res.documents as unknown as Producto[]);
        } catch (error) {
        console.error("Error al cargar productos:", error);
        } finally {
        setCargando(false);
        }
    };

    const handleGuardarManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombreManual.trim() || !precioManual || !proveedorSeleccionado) return;

        try {
        setGuardando(true);
        const nuevo = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.PRODUCTOS,
            ID.unique(),
            {
            nombre: nombreManual.trim(),
            precio: parseFloat(precioManual.replace(",", ".")),
            unidad_medida: unidadManual, 
            proveedor_id: proveedorSeleccionado,
            }
        );

        setProductos((prev) => [nuevo as unknown as Producto, ...prev]);
        setNombreManual("");
        setPrecioManual("");
        setUnidadManual("un");
        mostrarAlerta("Producto agregado correctamente");
        } catch (error: any) {
        console.error("Error al guardar producto:", error);
        alert("Error de Appwrite: " + (error.message || error));
        } finally {
        setGuardando(false);
        }
    };

    const handleImportarMasivo = async () => {
        if (!textoMasivo.trim() || !proveedorSeleccionado) return;

        const lineas = textoMasivo.split("\n");
        const aCargar: { nombre: string; precio: number; unidad: string }[] = [];

        for (const linea of lineas) {
        const fila = linea.trim();
        if (!fila) continue;

        let partes = fila.split("\t");
        if (partes.length < 2) partes = fila.split(";");
        if (partes.length < 2) partes = fila.split(",");

        if (partes.length >= 2) {
            const nombre = partes[0].trim();
            const precioLimpio = partes[1].replace("$", "").replace(/\s/g, "").replace(",", ".").trim();
            const precio = parseFloat(precioLimpio);
            const unidad = partes[2] ? partes[2].trim().toLowerCase() : "un";

            if (nombre && !isNaN(precio)) {
            aCargar.push({ nombre, precio, unidad: unidad === "kg" ? "kg" : "un" });
            }
        }
        }

        if (aCargar.length === 0) {
        alert("No se detectaron filas válidas.");
        return;
        }

        try {
        setGuardando(true);
        let creados = 0;
        for (const item of aCargar) {
            await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.PRODUCTOS,
            ID.unique(),
            {
                nombre: item.nombre,
                precio: item.precio,
                unidad_medida: item.unidad,
                proveedor_id: proveedorSeleccionado,
            }
            );
            creados++;
        }

        setTextoMasivo("");
        setModoMasivo(false);
        mostrarAlerta(`¡Se cargaron ${creados} productos con éxito!`);
        await cargarProductos(proveedorSeleccionado);
        } catch (error) {
        console.error("Error en carga masiva:", error);
        alert("Ocurrió un error cargando algunos artículos.");
        } finally {
        setGuardando(false);
        }
    };

    const handleEliminar = async (id: string) => {
        if (!confirm("¿Eliminar este producto?")) return;
        try {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PRODUCTOS, id);
        setProductos((prev) => prev.filter((p) => p.$id !== id));
        } catch (error) {
        console.error("Error al eliminar:", error);
        }
    };

    const handleActualizar = async (id: string) => {
        if (!editNombre.trim() || !editPrecio) return;
        try {
        const precioNum = parseFloat(editPrecio.toString().replace(",", "."));
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.PRODUCTOS,
            id,
            {
            nombre: editNombre.trim(),
            precio: precioNum,
            unidad_medida: editUnidad,
            }
        );
        
        // Actualizamos la lista local
        setProductos((prev) =>
            prev.map((p) =>
            p.$id === id ? { ...p, nombre: editNombre.trim(), precio: precioNum, unidad_medida: editUnidad } : p
            )
        );
        setEditandoId(null);
        mostrarAlerta("Producto actualizado correctamente");
        } catch (error) {
        console.error("Error al actualizar:", error);
        alert("Hubo un error al actualizar el producto.");
        }
    };

    const mostrarAlerta = (msg: string) => {
        setMensajeExito(msg);
        setTimeout(() => setMensajeExito(""), 4000);
    };

    const productosFiltrados = productos.filter((p) =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className={`min-h-screen p-6 md:p-10 font-sans transition-colors duration-300 ${modoOscuro ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-800"}`}>
        <div className="max-w-5xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
                <Link href="/" className={`flex items-center gap-2 text-sm font-semibold transition mb-2 ${modoOscuro ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}>
                <ArrowLeft size={18} /> Volver al Inicio
                </Link>
                <h1 className={`text-2xl font-bold ${modoOscuro ? "text-white" : "text-gray-900"}`}>Catálogo de Productos</h1>
            </div>

            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 p-2 rounded-xl border shadow-sm transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
                <span className={`text-xs font-semibold uppercase px-2 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Proveedor:</span>
                <select
                    value={proveedorSeleccionado}
                    onChange={(e) => setProveedorSeleccionado(e.target.value)}
                    className={`bg-transparent font-bold focus:outline-none text-sm cursor-pointer pr-4 ${modoOscuro ? "text-gray-200" : "text-gray-900"}`}
                >
                    {proveedores.map((prov) => (
                    <option key={prov.$id} value={prov.$id} className={modoOscuro ? "text-gray-900" : ""}>{prov.nombre}</option>
                    ))}
                </select>
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
            </div>

            {mensajeExito && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border shadow-sm ${modoOscuro ? "bg-green-900/30 border-green-800 text-green-400" : "bg-green-50 border-green-200 text-green-700"}`}>
                <CheckCircle size={18} /> {mensajeExito}
            </div>
            )}

            <div className="flex gap-2 mb-4">
            <button
                onClick={() => setModoMasivo(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                !modoMasivo 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : modoOscuro ? "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700" : "bg-white text-gray-600 border border-gray-200"
                }`}
            >
                + Carga Manual
            </button>
            <button
                onClick={() => setModoMasivo(true)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
                modoMasivo 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : modoOscuro ? "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700" : "bg-white text-gray-600 border border-gray-200"
                }`}
            >
                <FileSpreadsheet size={16} /> Importar de Excel / Copiar Lista
            </button>
            </div>

            {!modoMasivo ? (
            <div className={`rounded-2xl p-6 shadow-sm border mb-8 transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
                <h2 className={`text-base font-bold mb-4 ${modoOscuro ? "text-white" : "text-gray-800"}`}>Agregar artículo suelto</h2>
                <form onSubmit={handleGuardarManual} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                    <label className={`block text-xs font-semibold uppercase mb-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Nombre del producto *</label>
                    <input
                    type="text"
                    required
                    value={nombreManual}
                    onChange={(e) => setNombreManual(e.target.value)}
                    placeholder="Ej. Pan Mignon o Alfajor"
                    className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                    />
                </div>

                <div>
                    <label className={`block text-xs font-semibold uppercase mb-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Costo ($) *</label>
                    <input
                    type="number"
                    step="0.01"
                    required
                    value={precioManual}
                    onChange={(e) => setPrecioManual(e.target.value)}
                    placeholder="Ej. 1250"
                    className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                    />
                </div>

                <div>
                    <label className={`block text-xs font-semibold uppercase mb-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Se vende por *</label>
                    <select
                    value={unidadManual}
                    onChange={(e) => setUnidadManual(e.target.value as "un" | "kg")}
                    className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                    >
                    <option value="un">Unidades (un)</option>
                    <option value="kg">Kilos (kg)</option>
                    </select>
                </div>

                <div className="md:col-span-4 flex justify-end">
                    <button
                    type="submit"
                    disabled={guardando}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm"
                    >
                    {guardando ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Cargar Producto</>}
                    </button>
                </div>
                </form>
            </div>
            ) : (
            <div className={`rounded-2xl p-6 shadow-sm border mb-8 transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
                <h2 className={`text-base font-bold mb-2 ${modoOscuro ? "text-white" : "text-gray-800"}`}>Pegar filas desde Excel</h2>
                <p className={`text-xs mb-4 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                Formato esperado por línea: <code className={modoOscuro ? "text-blue-400" : "text-blue-600"}>Nombre [Tabulador] Precio [Tabulador] un o kg</code>
                </p>

                <textarea
                rows={5}
                value={textoMasivo}
                onChange={(e) => setTextoMasivo(e.target.value)}
                placeholder={`Pan Mignon\t2300\tkg\nAlfajor Rasta\t1600\tun`}
                className={`w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono mb-4 transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                />

                <button
                onClick={handleImportarMasivo}
                disabled={guardando || !textoMasivo.trim()}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2 transition disabled:opacity-50 text-sm"
                >
                {guardando ? <Loader2 size={18} className="animate-spin" /> : <><Upload size={18} /> Procesar e Importar</>}
                </button>
            </div>
            )}

            <div className={`rounded-2xl p-6 shadow-sm border transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className={`text-lg font-bold ${modoOscuro ? "text-white" : "text-gray-800"}`}>
                Artículos ({productosFiltrados.length})
                </h2>

                <div className="relative w-full md:w-64">
                <Search size={16} className={`absolute left-3 top-3 ${modoOscuro ? "text-gray-500" : "text-gray-400"}`} />
                <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar en la lista..."
                    className={`w-full pl-9 pr-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                />
                </div>
            </div>

            {cargando ? (
                <div className="flex justify-center py-10 text-gray-400">
                <Loader2 size={32} className="animate-spin" />
                </div>
            ) : productosFiltrados.length === 0 ? (
                <p className={`text-center py-10 text-sm ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>
                No hay productos para este proveedor todavía.
                </p>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                    <tr className={`border-b uppercase text-xs ${modoOscuro ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                        <th className="pb-3 font-semibold">Producto</th>
                        <th className="pb-3 font-semibold text-center">Se vende por</th>
                        <th className="pb-3 font-semibold text-right">Precio Costo</th>
                        <th className="pb-3 text-right">Acción</th>
                    </tr>
                    </thead>
                    <tbody className={`divide-y ${modoOscuro ? "divide-gray-800" : "divide-gray-50"}`}>
                    {productosFiltrados.map((item) => (
                        <tr key={item.$id} className={`transition ${modoOscuro ? "hover:bg-gray-800/50" : "hover:bg-gray-50/50"}`}>
                        
                        {editandoId === item.$id ? (
                            <>
                            <td className="py-2 pr-2">
                                <input
                                type="text"
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                className={`w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${modoOscuro ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                placeholder="Nombre"
                                />
                            </td>
                            <td className="py-2 px-2 text-center">
                                <select
                                value={editUnidad}
                                onChange={(e) => setEditUnidad(e.target.value as "un" | "kg")}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 ${modoOscuro ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                >
                                <option value="un">UN</option>
                                <option value="kg">KG</option>
                                </select>
                            </td>
                            <td className="py-2 px-2 text-right">
                                <input
                                type="number"
                                step="0.01"
                                value={editPrecio}
                                onChange={(e) => setEditPrecio(e.target.value)}
                                className={`w-28 ml-auto px-3 py-1.5 rounded-lg border text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 ${modoOscuro ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                placeholder="Precio"
                                />
                            </td>
                            <td className="py-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleActualizar(item.$id)} className="p-1.5 transition text-green-500 hover:text-green-400" title="Guardar">
                                    <Check size={18} />
                                </button>
                                <button onClick={() => setEditandoId(null)} className="p-1.5 transition text-red-500 hover:text-red-400" title="Cancelar">
                                    <X size={18} />
                                </button>
                                </div>
                            </td>
                            </>
                        ) : (
                            <>
                            <td className={`py-3 font-medium ${modoOscuro ? "text-gray-200" : "text-gray-800"}`}>{item.nombre}</td>
                            <td className="py-3 text-center">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                                item.unidad_medida === "kg" 
                                    ? modoOscuro ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-700" 
                                    : modoOscuro ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700"
                                }`}>
                                {item.unidad_medida || "un"}
                                </span>
                            </td>
                            <td className={`py-3 text-right font-bold ${modoOscuro ? "text-white" : "text-gray-900"}`}>
                                ${item.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                <button 
                                    onClick={() => {
                                    setEditandoId(item.$id);
                                    setEditNombre(item.nombre);
                                    setEditPrecio(item.precio.toString());
                                    setEditUnidad((item.unidad_medida as "un" | "kg") || "un");
                                    }} 
                                    className={`transition p-1.5 ${modoOscuro ? "text-gray-500 hover:text-blue-400" : "text-gray-400 hover:text-blue-600"}`}
                                    title="Editar producto"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button onClick={() => handleEliminar(item.$id)} className={`transition p-1.5 ${modoOscuro ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-600"}`} title="Eliminar producto">
                                    <Trash2 size={18} />
                                </button>
                                </div>
                            </td>
                            </>
                        )}
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
            </div>

        </div>
        </div>
    );
    }