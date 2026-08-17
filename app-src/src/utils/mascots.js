import Mascot from "../components/Mascot";
import Fox from "../components/Fox";
import Otter from "../components/Otter";
import Cloud from "../components/Cloud";
import Squirrel from "../components/Squirrel";

// Each handbook gets its own companion so different pages actually feel different, per
// request -- Dashboard/Profile keep the owl as "your" overall companion; each book's own
// pages show that book's companion instead.
const REGISTRY = {
  ssh: Mascot, // owl
  ai: Fox,
  pbh: Otter,
  cep: Cloud, // drifts sideways instead of bobbing -- Cloud Engineering Playbook
  dsa: Squirrel, // holds an acorn -- DSA Engineering Handbook
  peg: Mascot, // owl doubles as the field guide's companion too -- both are "general knowledge" books
  ces: Mascot, // owl doubles as the challenge-series companion for now
};

export function mascotForBook(bookId) {
  return REGISTRY[bookId] || Mascot;
}
