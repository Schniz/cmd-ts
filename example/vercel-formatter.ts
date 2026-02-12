import { vercelFormatter } from "../batteries/vercel-formatter";
import { setDefaultHelpFormatter } from "../src";

setDefaultHelpFormatter(vercelFormatter);

import("./app");
