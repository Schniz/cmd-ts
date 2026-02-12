import { vercelFormatter } from "../batteries/vercelFormatter";
import { setDefaultHelpFormatter } from "../src";

setDefaultHelpFormatter(vercelFormatter);

import("./app");
