    "use client";

    import { useState, useEffect } from "react";
    import { databases, DATABASE_ID, COLLECTIONS } from "../../lib/appwrite";
    import { ID, Query } from "appwrite";
    import { ArrowLeft, Loader2, Plus, Trash2, ShoppingCart, CheckCircle, MessageCircle, Save, X, FileText, Calendar, ChevronDown, ChevronUp, Moon, Sun, Info } from "lucide-react";
    import Link from "next/link";

    interface Proveedor {
    $id: string;
    nombre: string;
    telefono?: string;
    }

    interface Producto {
    $id: string;
    nombre: string;
    precio: number;
    unidad_medida?: string;
    }

    interface ItemCarrito {
    id_producto: string;
    nombre: string;
    cantidad: number;
    unidad_medida: string;
    precio_unitario: number;
    subtotal: number;
    }

    interface GastoDelDia {
    $id: string;
    proveedor_nombre: string;
    total: number;
    fecha: string;
    $createdAt: string;
    }

    interface DetallePedido {
    $id: string;
    pedido_id: string;
    producto_nombre: string;
    cantidad: number;
    unidad_medida?: string;
    subtotal: number;
    }

    export default function PedidosPage() {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");
    
    const [productos, setProductos] = useState<Producto[]>([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");
    const [cantidad, setCantidad] = useState<number | "">("");

    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [cargandoDatos, setCargandoDatos] = useState(false);
    const [guardandoPedido, setGuardandoPedido] = useState(false);
    const [mensajeExito, setMensajeExito] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    
    const [gastos, setGastos] = useState<GastoDelDia[]>([]);
    const [detalles, setDetalles] = useState<DetallePedido[]>([]);
    const [cargandoResumen, setCargandoResumen] = useState(false);
    
    const [filtroFecha, setFiltroFecha] = useState<string>("hoy");
    const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);

    const [modoOscuro, setModoOscuro] = useState(false);

    // NUEVO ESTADO: Cuadro de Diálogo Personalizado
    const [alerta, setAlerta] = useState({ abierto: false, mensaje: "" });

    const mostrarAlerta = (mensaje: string) => {
        setAlerta({ abierto: true, mensaje });
    };

    useEffect(() => {
        const temaGuardado = localStorage.getItem("brumi_tema");
        if (temaGuardado === "oscuro") setModoOscuro(true);

        cargarProveedores();
        cargarHistorial();
    }, []);

    const toggleModoOscuro = () => {
        const nuevoEstado = !modoOscuro;
        setModoOscuro(nuevoEstado);
        localStorage.setItem("brumi_tema", nuevoEstado ? "oscuro" : "claro");
    };

    useEffect(() => {
        if (proveedorSeleccionado) {
        cargarProductos(proveedorSeleccionado);
        setCarrito([]); 
        } else {
        setProductos([]);
        }
    }, [proveedorSeleccionado]);

    const cargarProveedores = async () => {
        try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROVEEDORES, [
            Query.orderAsc("nombre"),
        ]);
        setProveedores(res.documents as unknown as Proveedor[]);
        if (res.documents.length > 0) setProveedorSeleccionado(res.documents[0].$id);
        } catch (error) {
        console.error("Error al cargar proveedores:", error);
        }
    };

    const cargarProductos = async (provId: string) => {
        try {
        setCargandoDatos(true);
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTOS, [
            Query.equal("proveedor_id", provId),
            Query.orderAsc("nombre"),
            Query.limit(200),
        ]);
        setProductos(res.documents as unknown as Producto[]);
        if (res.documents.length > 0) setProductoSeleccionado(res.documents[0].$id);
        } catch (error) {
        console.error("Error al cargar productos:", error);
        } finally {
        setCargandoDatos(false);
        }
    };

    const cargarHistorial = async () => {
        try {
        setCargandoResumen(true);
        const resGastos = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GASTOS, [
            Query.orderDesc("$createdAt"),
            Query.limit(200),
        ]);
        setGastos(resGastos.documents as unknown as GastoDelDia[]);

        const resDetalles = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DETALLE_PEDIDOS, [
            Query.limit(500),
        ]);
        setDetalles(resDetalles.documents as unknown as DetallePedido[]);
        } catch (error) {
        console.error("Error al cargar historial:", error);
        } finally {
        setCargandoResumen(false);
        }
    };

    const agregarAlCarrito = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productoSeleccionado || !cantidad || cantidad <= 0) return;

        const producto = productos.find((p) => p.$id === productoSeleccionado);
        if (!producto) return;

        const nuevoItem: ItemCarrito = {
        id_producto: producto.$id,
        nombre: producto.nombre,
        cantidad: Number(cantidad),
        unidad_medida: producto.unidad_medida || "un",
        precio_unitario: producto.precio,
        subtotal: producto.precio * Number(cantidad),
        };

        setCarrito([...carrito, nuevoItem]);
        setCantidad(""); 
    };

    const quitarDelCarrito = (index: number) => {
        const nuevoCarrito = [...carrito];
        nuevoCarrito.splice(index, 1);
        setCarrito(nuevoCarrito);
    };

    const totalGasto = carrito.reduce((acc, item) => acc + item.subtotal, 0);

    const ejecutarGuardado = async () => {
        const prov = proveedores.find((p) => p.$id === proveedorSeleccionado);
        if (!prov) return false;

        try {
        setGuardandoPedido(true);
        const gastoCreado = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.GASTOS,
            ID.unique(),
            {
            proveedor_nombre: prov.nombre,
            total: totalGasto,
            fecha: new Date().toISOString(),
            }
        );

        const promesasDetalles = carrito.map((item) =>
            databases.createDocument(DATABASE_ID, COLLECTIONS.DETALLE_PEDIDOS, ID.unique(), {
            pedido_id: gastoCreado.$id,
            producto_nombre: item.nombre,
            cantidad: item.cantidad,
            unidad_medida: item.unidad_medida,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal,
            })
        );

        await Promise.all(promesasDetalles);
        
        setCarrito([]);
        setModalAbierto(false);
        setMensajeExito("¡Pedido registrado con éxito en el sistema!");
        await cargarHistorial(); 
        setTimeout(() => setMensajeExito(""), 4000);
        return true;

        } catch (error: any) {
        console.error("Error al guardar pedido:", error);
        mostrarAlerta("Error de sistema: " + (error.message || error));
        return false;
        } finally {
        setGuardandoPedido(false);
        }
    };

    const guardarYEnviarWhatsApp = async () => {
        const prov = proveedores.find((p) => p.$id === proveedorSeleccionado);
        if (!prov) return;

        if (!prov.telefono) {
        mostrarAlerta(`El proveedor ${prov.nombre} no tiene un teléfono cargado. El pedido solo se guardará en el sistema.`);
        await ejecutarGuardado();
        return;
        }

        let texto = `Hola! Te paso el pedido de Brumi Kiosco:\n`;
        carrito.forEach(item => {
        const medida = item.unidad_medida === "kg" ? "kg" : "un";
        texto += `- ${item.cantidad} ${medida} de ${item.nombre}\n`;
        });
        texto += `¡Gracias!`;

        const exito = await ejecutarGuardado();
        
        if (exito) {
        const url = `https://wa.me/${prov.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
        }
    };

    const gastosFiltrados = gastos.filter((g) => {
        const fechaGasto = new Date(g.fecha || g.$createdAt);
        const hoy = new Date();

        if (filtroFecha === "hoy") {
        return fechaGasto.toDateString() === hoy.toDateString();
        } else if (filtroFecha === "semana") {
        const hace7Dias = new Date();
        hace7Dias.setDate(hoy.getDate() - 7);
        return fechaGasto >= hace7Dias;
        } else if (filtroFecha === "mes") {
        return (
            fechaGasto.getMonth() === hoy.getMonth() &&
            fechaGasto.getFullYear() === hoy.getFullYear()
        );
        }
        return true; 
    });

    const enviarResumenGlobalWhatsApp = () => {
        if (gastosFiltrados.length === 0) {
        mostrarAlerta("No hay pedidos en el período seleccionado para armar el resumen.");
        return;
        }

        const totalGlobal = gastosFiltrados.reduce((acc, g) => acc + g.total, 0);

        let texto = `📊 *RESUMEN DE PEDIDOS (${filtroFecha.toUpperCase()}) - BRUMI KIOSCO*\n\n`;
        
        gastosFiltrados.forEach((g) => {
        const fechaFormateada = new Date(g.fecha || g.$createdAt).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
        
        texto += `📦 *${g.proveedor_nombre}* (${fechaFormateada})\n`;
        
        const itemsDelPedido = detalles.filter((d) => d.pedido_id === g.$id);
        itemsDelPedido.forEach((item) => {
            const medida = item.unidad_medida === "kg" ? "kg" : "un";
            texto += `   • ${item.cantidad} ${medida} - ${item.producto_nombre}\n`;
        });

        texto += `   💵 *Subtotal:* $${g.total.toLocaleString("es-AR")}\n\n`;
        });

        texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `💰 *TOTAL GENERAL: $${totalGlobal.toLocaleString("es-AR")}*`;

        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    };

    return (
        <div className={`min-h-screen p-6 md:p-10 font-sans transition-colors duration-300 ${modoOscuro ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-800"}`}>
        
        {/* CUADRO DE DIÁLOGO PERSONALIZADO (REEMPLAZO DEL ALERT NATIVO) */}
        {alerta.abierto && (
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
            <div className={`rounded-2xl w-full max-w-sm p-6 shadow-2xl relative border text-center flex flex-col items-center animate-in zoom-in-95 duration-200 ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${modoOscuro ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                <Info size={24} />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${modoOscuro ? "text-white" : "text-gray-900"}`}>Aviso del Sistema</h3>
                <p className={`mb-6 text-sm ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                {alerta.mensaje}
                </p>
                <button
                onClick={() => setAlerta({ abierto: false, mensaje: "" })}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition"
                >
                Aceptar
                </button>
            </div>
            </div>
        )}

        {/* MODAL DE CONFIRMACIÓN DE PEDIDO */}
        {modalAbierto && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
            <div className={`rounded-2xl w-full max-w-md p-6 shadow-2xl relative border animate-in zoom-in-95 duration-200 ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
                <button onClick={() => setModalAbierto(false)} className={`absolute top-4 right-4 transition ${modoOscuro ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-700"}`}>
                <X size={24} />
                </button>
                
                <h3 className={`text-xl font-bold mb-2 ${modoOscuro ? "text-white" : "text-gray-900"}`}>¿Registrar este pedido?</h3>
                <p className={`mb-6 text-sm ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                Para tu control interno, este pedido suma <span className={`font-bold ${modoOscuro ? "text-white" : "text-gray-900"}`}>${totalGasto.toLocaleString("es-AR")}</span> (al proveedor solo se le enviarán las cantidades sin precios).
                </p>

                <div className="flex flex-col gap-3">
                <button
                    onClick={guardarYEnviarWhatsApp}
                    disabled={guardandoPedido}
                    className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                >
                    {guardandoPedido ? <Loader2 className="animate-spin" /> : <><MessageCircle size={20} /> Guardar y Enviar Pedido</>}
                </button>
                
                <button
                    onClick={ejecutarGuardado}
                    disabled={guardandoPedido}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                >
                    {guardandoPedido ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Solo Guardar en el Sistema</>}
                </button>

                <button
                    onClick={() => setModalAbierto(false)}
                    className={`w-full font-semibold py-3 px-4 rounded-xl transition mt-2 ${modoOscuro ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                >
                    Cancelar y seguir editando
                </button>
                </div>
            </div>
            </div>
        )}

        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
                <Link href="/" className={`flex items-center gap-2 text-sm font-semibold transition mb-2 ${modoOscuro ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}>
                <ArrowLeft size={18} /> Volver al Inicio
                </Link>
                <h1 className={`text-2xl font-bold ${modoOscuro ? "text-white" : "text-gray-900"}`}>Registro de Compras y Pedidos</h1>
            </div>

            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 p-2 rounded-xl border shadow-sm transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
                <span className={`text-xs font-semibold uppercase px-2 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Comprando a:</span>
                <select
                    value={proveedorSeleccionado}
                    onChange={(e) => setProveedorSeleccionado(e.target.value)}
                    className={`bg-transparent font-bold focus:outline-none text-sm cursor-pointer pr-4 ${modoOscuro ? "text-gray-200" : "text-gray-900"}`}
                    disabled={carrito.length > 0} 
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
                >
                {modoOscuro ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
            </div>

            {mensajeExito && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 font-medium shadow-sm border ${modoOscuro ? "bg-green-900/30 border-green-800 text-green-400" : "bg-green-50 border-green-200 text-green-700"}`}>
                <CheckCircle size={20} /> {mensajeExito}
            </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            
            <div className={`lg:col-span-1 rounded-2xl p-6 shadow-sm border h-fit transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
                <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${modoOscuro ? "text-white" : "text-gray-800"}`}>
                <Plus size={18} className="text-blue-500"/> Agregar artículo
                </h2>
                
                {cargandoDatos ? (
                <div className="flex justify-center py-6 text-gray-400">
                    <Loader2 size={24} className="animate-spin" />
                </div>
                ) : productos.length === 0 ? (
                <p className={`text-sm text-center py-4 rounded-xl border ${modoOscuro ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"}`}>
                    Este proveedor no tiene productos en el catálogo.
                </p>
                ) : (
                <form onSubmit={agregarAlCarrito} className="flex flex-col gap-4">
                    <div>
                    <label className={`block text-xs font-semibold uppercase mb-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Producto</label>
                    <select
                        value={productoSeleccionado}
                        onChange={(e) => setProductoSeleccionado(e.target.value)}
                        className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                    >
                        {productos.map((p) => (
                        <option key={p.$id} value={p.$id}>
                            {p.nombre} (${p.precio} / {p.unidad_medida || "un"})
                        </option>
                        ))}
                    </select>
                    </div>

                    <div>
                    <label className={`block text-xs font-semibold uppercase mb-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Cantidad</label>
                    <input
                        type="number"
                        required
                        step="any"
                        min="0.1"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Ej. 2 o 1.5"
                        className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                    />
                    </div>

                    <button
                    type="submit"
                    className={`w-full font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm mt-2 ${modoOscuro ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"}`}
                    >
                    Agregar a la lista
                    </button>
                </form>
                )}
            </div>

            <div className={`lg:col-span-2 rounded-2xl p-6 shadow-sm border flex flex-col transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
                <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${modoOscuro ? "text-white" : "text-gray-800"}`}>
                <ShoppingCart size={18} className="text-blue-500"/> Detalle del Pedido Actual
                </h2>

                <div className="flex-1">
                {carrito.length === 0 ? (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-gray-400">
                    <ShoppingCart size={40} className={`mb-2 ${modoOscuro ? "opacity-10" : "opacity-20"}`} />
                    <p className="text-sm">El carrito está vacío</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                        <tr className={`border-b uppercase text-xs ${modoOscuro ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                            <th className="pb-3 font-semibold">Producto</th>
                            <th className="pb-3 font-semibold text-center">Cant.</th>
                            <th className="pb-3 font-semibold text-right">Unitario</th>
                            <th className="pb-3 font-semibold text-right">Subtotal</th>
                            <th className="pb-3 text-right"></th>
                        </tr>
                        </thead>
                        <tbody className={`divide-y ${modoOscuro ? "divide-gray-800" : "divide-gray-50"}`}>
                        {carrito.map((item, index) => (
                            <tr key={index} className={`transition ${modoOscuro ? "hover:bg-gray-800/50" : "hover:bg-gray-50/50"}`}>
                            <td className={`py-3 font-medium ${modoOscuro ? "text-gray-200" : "text-gray-800"}`}>{item.nombre}</td>
                            <td className={`py-3 text-center font-bold ${modoOscuro ? "text-gray-400" : "text-gray-600"}`}>
                                {item.cantidad} {item.unidad_medida}
                            </td>
                            <td className={`py-3 text-right ${modoOscuro ? "text-gray-500" : "text-gray-500"}`}>${item.precio_unitario}</td>
                            <td className={`py-3 text-right font-bold ${modoOscuro ? "text-white" : "text-gray-900"}`}>${item.subtotal.toLocaleString("es-AR")}</td>
                            <td className="py-3 text-right">
                                <button onClick={() => quitarDelCarrito(index)} className={`transition p-1 ${modoOscuro ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-600"}`}>
                                <Trash2 size={16} />
                                </button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                )}
                </div>

                {carrito.length > 0 && (
                <div className={`mt-6 pt-6 border-t ${modoOscuro ? "border-gray-800" : "border-gray-100"}`}>
                    <div className="flex justify-between items-end mb-6">
                    <span className={`font-semibold uppercase text-sm ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Total estimado:</span>
                    <span className={`text-3xl font-bold ${modoOscuro ? "text-white" : "text-gray-900"}`}>${totalGasto.toLocaleString("es-AR")}</span>
                    </div>
                    <button
                    onClick={() => setModalAbierto(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-base shadow-sm"
                    >
                    Confirmar Pedido...
                    </button>
                </div>
                )}
                
            </div>
            </div>

            <div className={`rounded-2xl p-6 shadow-sm border transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${modoOscuro ? "text-white" : "text-gray-800"}`}>
                    <FileText size={20} className="text-blue-500"/> Historial de Pedidos y Gastos
                </h2>
                <p className={`text-xs mt-0.5 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>Filtrá por fecha y hacé clic en un pedido para ver su detalle</p>
                </div>

                <div className="flex items-center gap-3">
                <button
                    onClick={enviarResumenGlobalWhatsApp}
                    className="bg-[#25D366] hover:bg-[#1ebd5a] text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition text-sm shadow-sm"
                >
                    <MessageCircle size={16} /> Enviar Resumen
                </button>
                </div>
            </div>

            <div className={`flex flex-wrap gap-2 mb-6 p-3 rounded-xl border ${modoOscuro ? "bg-gray-800/50 border-gray-800" : "bg-gray-50 border-gray-100"}`}>
                <span className={`text-xs font-semibold uppercase flex items-center gap-1 mr-2 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                <Calendar size={14}/> Filtrar:
                </span>
                <button
                onClick={() => setFiltroFecha("hoy")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroFecha === "hoy" ? "bg-blue-600 text-white shadow-sm" : modoOscuro ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-white text-gray-600 border border-gray-200"}`}
                >
                Hoy
                </button>
                <button
                onClick={() => setFiltroFecha("semana")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroFecha === "semana" ? "bg-blue-600 text-white shadow-sm" : modoOscuro ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-white text-gray-600 border border-gray-200"}`}
                >
                Últimos 7 días
                </button>
                <button
                onClick={() => setFiltroFecha("mes")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroFecha === "mes" ? "bg-blue-600 text-white shadow-sm" : modoOscuro ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-white text-gray-600 border border-gray-200"}`}
                >
                Este Mes
                </button>
                <button
                onClick={() => setFiltroFecha("todos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroFecha === "todos" ? "bg-blue-600 text-white shadow-sm" : modoOscuro ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-white text-gray-600 border border-gray-200"}`}
                >
                Historial Completo
                </button>
            </div>

            {cargandoResumen ? (
                <div className="flex justify-center py-10 text-gray-400">
                <Loader2 size={32} className="animate-spin" />
                </div>
            ) : gastosFiltrados.length === 0 ? (
                <p className={`text-center py-10 text-sm ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>
                No hay pedidos registrados en este período.
                </p>
            ) : (
                <div className="space-y-3">
                {gastosFiltrados.map((g) => {
                    const estaExpandido = pedidoExpandido === g.$id;
                    const itemsPedido = detalles.filter((d) => d.pedido_id === g.$id);

                    return (
                    <div key={g.$id} className={`border rounded-xl overflow-hidden transition shadow-sm ${modoOscuro ? "bg-gray-800/30 border-gray-800" : "bg-white border-gray-100"}`}>
                        <div 
                        onClick={() => setPedidoExpandido(estaExpandido ? null : g.$id)}
                        className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 cursor-pointer transition ${modoOscuro ? "hover:bg-gray-800/50" : "hover:bg-gray-50/80"}`}
                        >
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${modoOscuro ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                            {estaExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                            <div>
                            <p className={`font-bold text-base ${modoOscuro ? "text-gray-200" : "text-gray-800"}`}>{g.proveedor_nombre}</p>
                            <p className={`text-xs ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>
                                {new Date(g.fecha || g.$createdAt).toLocaleString("es-AR")}
                            </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 justify-between md:justify-end">
                            <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${modoOscuro ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                            {itemsPedido.length} {itemsPedido.length === 1 ? "artículo" : "artículos"}
                            </span>
                            <span className={`font-bold text-lg ${modoOscuro ? "text-white" : "text-gray-900"}`}>
                            ${g.total.toLocaleString("es-AR")}
                            </span>
                        </div>
                        </div>

                        {estaExpandido && (
                        <div className={`p-4 border-t animate-in fade-in duration-200 ${modoOscuro ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-100"}`}>
                            <p className={`text-xs font-bold uppercase mb-2 ${modoOscuro ? "text-gray-500" : "text-gray-400"}`}>Productos solicitados:</p>
                            <ul className="space-y-1.5">
                            {itemsPedido.map((item) => (
                                <li key={item.$id} className={`flex justify-between items-center text-sm p-2.5 rounded-lg border ${modoOscuro ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                                <span className={`font-medium ${modoOscuro ? "text-gray-300" : "text-gray-800"}`}>
                                    • {item.cantidad} {item.unidad_medida || "un"} de {item.producto_nombre}
                                </span>
                                <span className={`font-semibold ${modoOscuro ? "text-gray-400" : "text-gray-600"}`}>
                                    ${item.subtotal.toLocaleString("es-AR")}
                                </span>
                                </li>
                            ))}
                            </ul>
                        </div>
                        )}
                    </div>
                    );
                })}
                </div>
            )}
            </div>

        </div>
        </div>
    );
    }