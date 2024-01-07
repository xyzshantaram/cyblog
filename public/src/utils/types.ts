export interface CyblogConfig {
    pat: string | null;
    useGithub: boolean;
    workspace: string;
    toNamespaced: (str: string) => string;
}

export type RawEventTypeKind = "metadata" | "file" | "data" | "kind" | "close";

export interface RawFsEventExpanded {
    paths: string[],
    attrs: Record<string, any>,
    type: {
        modify?: {
            kind: "rename",
            mode: "from" | "to" | "both"
        } | {
            kind: RawEventTypeKind,
            mode: string
        }
        access?: {
            kind: RawEventTypeKind,
            mode: string
        }
        create?: {
            kind: RawEventTypeKind
        }
        rename?: {
            kind: RawEventTypeKind
            mode: "from" | "to" | "both"
        }
        remove?: {
            kind: RawEventTypeKind
        }
    } | "any"
}