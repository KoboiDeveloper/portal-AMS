import React from "react";

/**
 * Legacy wrapper — sidebar sekarang di DgsAppLayout (AdminShell), di luar Content.
 * Tetap dipakai di halaman agar import tidak pecah; hanya meneruskan children.
 */
const DgsContentShell = ({ children }) => <>{children}</>;

export default DgsContentShell;
