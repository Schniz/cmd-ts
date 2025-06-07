module.exports = {
	testEnvironment: "node",
	transform: {
		"^.+\\.(t|j)sx?$": ["@swc-node/jest"],
	},
};
