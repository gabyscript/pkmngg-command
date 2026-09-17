import type {Config} from '@netlify/functions'
import type { NextData, PkmnGgProfileResponse, UserStats} from './types';
import { profile } from 'console';

const NEXT_DATA_REGEX = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
const GLOBAL_CATEGORY_LABEL = "ALL"

const getBuildId = async (): Promise<string> => {

    let profilePage = process.env.PKMNGG_PROFILE ?? ""

    if (!profilePage) {
        throw new Error(`Perfil de pkmn.gg no configurado`);
    }

    const response = await fetch(profilePage, {
        headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es-CL,es;q=0.9",
        },
    });

    if (!response.ok) {
        throw new Error(`No se pudo obtener la pagina del perfil (status ${response.status})`);
    }

    let profileHtml = await response.text()
    const match = profileHtml.match(NEXT_DATA_REGEX);

    if (!match) {
        throw new Error("No se encontro el script __NEXT_DATA__ en el HTML del perfil");
    }

    const nextData = JSON.parse(match[1]) as NextData;

    if (!nextData.buildId) {
        throw new Error("__NEXT_DATA__ no contiene un buildId");
    }

    return nextData.buildId;
}

const getProfileData = async (username: string, buildId:string): Promise<UserStats> => {

    let profileDataTemplate = process.env.PKMNGG_URL_TEMPLATE ?? ""

    if (!profileDataTemplate) {
        throw new Error("Template de pkmn.gg no configurado");
    }
    
    let profileDataUrl = profileDataTemplate?.replace("{buildId}", buildId)

    const response = await fetch(profileDataUrl)

    if (!response.ok) {
        throw new Error("No se pudo obtener datos de perfil");
    }

    const profileData= (await response.json()) as PkmnGgProfileResponse;

    const globalStats = profileData.pageProps.userStats.find(x => x.category === GLOBAL_CATEGORY_LABEL)

    if(!globalStats) {
         throw new Error("No hay datos globales del perfil");
    }

    return {
        category: globalStats.category,        
        uniqueCardCount : globalStats.uniqueCardCount,
        collectionValue : Math.round(globalStats.collectionValue * 100) / 100
    }
    
}

const formatMessage = (stats:UserStats) :string => {
    return `Cartas totales: ${stats.uniqueCardCount} | Valor de la colección: $${stats.collectionValue} | Perfil: https://www.pkmn.gg/u/gabyranma |` 
}

export default async (req:Request) => {

    try {
        const buildId = await getBuildId();        
        const profileData : UserStats = await getProfileData("gabyranma", buildId);

        return new Response(formatMessage(profileData), {
            headers: { "Content-Type": "text/plain" },
        });
    } catch (error) {
        console.error("[pkmngg] fallo al obtener datos de pkmn.gg:", error);

        return new Response("No pude obtener los datos ahora, intenta de nuevo mas tarde.", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
        });
    }
}

export const  config : Config =  {
  path: "/api/pkmn-gg",
  method: ["GET"]
};