// Definition of the types used in the schemas. We're not using the MODULE_NAME.d.ts
// pattern because the types from it would shadow exports from MODULE_NAME.js

import { GenericSchema } from 'valibot'

export interface GuidanceNavigationItem {
    label: string;
    url: string;
    items?: GuidanceNavigationItem[];
}

export interface GuidanceNavigation {
    navigation: {
        title: string;
        items: GuidanceNavigationItem[];
    }[];
}
