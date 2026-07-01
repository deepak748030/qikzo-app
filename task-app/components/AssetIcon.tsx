import React from 'react';
import { Image, View, ImageStyle, StyleProp } from 'react-native';
import { getIconSource } from '@/lib/iconMap';

type Props = {
    id: string;
    size?: number;
    style?: StyleProp<ImageStyle>;
};

// Renders one of the generated illustration icons (bike / auto / cab /
// groceries / food / medicines / parcel / other). Falls back to "other".
export default function AssetIcon({ id, size = 40, style }: Props) {
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Image
                source={getIconSource(id)}
                resizeMode="contain"
                style={[{ width: size, height: size }, style]}
            />
        </View>
    );
}