const path = require("path");
const fsExtra = require("fs-extra");

const copyLicense = async () => {
    const targetDir = path.resolve(process.cwd(), "./package");

    const licenseFile = path.resolve(process.cwd(), "../../LICENSE.txt");
    const targetLicenseFile = path.join(targetDir, "LICENSE.txt");
    await fsExtra.copy(licenseFile, targetLicenseFile, { overwrite: true });

    const thirdPartyLicenseDir = path.resolve(process.cwd(), "./LICENSES");
    const targetLicenseDir = path.join(targetDir, "LICENSES");
    await fsExtra.copy(thirdPartyLicenseDir, targetLicenseDir, { overwrite: true });
};

module.exports = copyLicense;
