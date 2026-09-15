import { Client, Account, Databases } from "appwrite";

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "");

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";

// IDs de las tablas
export const COLLECTIONS = {
    PROVEEDORES: "proveedores",
    PRODUCTOS: "productos",
    GASTOS: "gastos",
    DETALLE_PEDIDOS: "detallepedidos",
    };