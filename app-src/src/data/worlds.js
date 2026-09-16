export const WORLDS = {
 ssh:{name:"The architecture district",kind:"city",color:"#73c9ed"},
 ai:{name:"The neural constellation",kind:"neural",color:"#bba0ef"},
 pbh:{name:"The engine room",kind:"engine",color:"#7ad6bb"},
 cep:{name:"The floating archipelago",kind:"islands",color:"#e8bc7a"},
 dsa:{name:"The branching garden",kind:"tree",color:"#b79bdd"},
 peg:{name:"The expedition atlas",kind:"atlas",color:"#75c4a7"},
 java:{name:"The foundry",kind:"engine",color:"#efb566"},
};
export function worldFor(id){return WORLDS[id]||{name:"The discovery frontier",kind:"atlas",color:"#bde993"};}
