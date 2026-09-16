import Companion from "./Companion";
import { usePreferences } from "../utils/preferences";
export default function Mascot(props) { const {prefs}=usePreferences(); return <Companion {...props} kind={prefs.companion}/>; }
