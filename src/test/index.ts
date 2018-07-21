import game from "./game";
import observable from "./observable";

async function main() {
    await observable();
    await game();
}

main().catch((e) => {
    // tslint:disable-next-line:no-console
    console.error(e);
});
