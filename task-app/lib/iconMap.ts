// Central mapping of category / ride id → generated PNG icon.
// Kept in one place so the home, booking, and detail screens
// always render the same illustration.

const ICONS: Record<string, any> = {
    // rides
    bike: require('../assets/icons/bike.png'),
    auto: require('../assets/icons/auto.png'),
    cab: require('../assets/icons/cab.png'),
    // delivery categories
    groceries: require('../assets/icons/groceries.png'),
    food: require('../assets/icons/food.png'),
    medicines: require('../assets/icons/medicines.png'),
    parcel: require('../assets/icons/parcel.png'),
    other: require('../assets/icons/other.png'),
};

export function getIconSource(id: string) {
    return ICONS[id] || ICONS.other;
}