import { useEffect, useState } from "react";

export function useDeviceOrientation() {
    const [heading, setHeading] = useState<number | null>(null);
    const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

    useEffect(() => {
        // Check if permission is needed (iOS 13+)
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            // We can't automatically request permission, it must be user triggered.
            // So we just wait for the user to trigger it elsewhere or assume false initially.
            setPermissionGranted(false);
        } else {
            setPermissionGranted(true);
        }
    }, []);

    useEffect(() => {
        if (!permissionGranted) return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            let compass = null;

            // iOS (webkitCompassHeading) vs Android (alpha with absolute true)
            if ((event as any).webkitCompassHeading) {
                // iOS
                compass = (event as any).webkitCompassHeading;
            } else if (event.absolute && event.alpha !== null) {
                // Android (alpha increases counter-clockwise, so we reverse it)
                compass = 360 - event.alpha;
            }

            if (compass !== null) {
                setHeading(compass);
            }
        };

        window.addEventListener("deviceorientation", handleOrientation, true);

        return () => {
            window.removeEventListener("deviceorientation", handleOrientation, true);
        };
    }, [permissionGranted]);

    const requestAccess = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceOrientationEvent as any).requestPermission();
                if (response === 'granted') {
                    setPermissionGranted(true);
                    return true;
                }
            } catch (e) {
                console.error("Orientation permission denied", e);
            }
            return false;
        }
        setPermissionGranted(true);
        return true;
    };

    return { heading, requestAccess, permissionGranted };
}
