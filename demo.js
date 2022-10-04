import Database from "sectional";

// The default settings use Nano and environment variables.
const defaultDatabase = await Database.connect('default');
// TODO Demonstrate more.