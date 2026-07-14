import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, fonts, radius } from '@/lib/theme';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };
    static getDerivedStateFromError(err: any): State {
        return { hasError: true, message: err?.message || 'Something went wrong' };
    }
    componentDidCatch(err: any, info: any) {
        if (__DEV__) console.error('[ErrorBoundary]', err, info);
    }
    reset = () => this.setState({ hasError: false, message: undefined });
    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <View style={styles.wrap}>
                <Text style={styles.title}>Something went wrong</Text>
                <Text style={styles.msg}>{this.state.message}</Text>
                <Pressable style={styles.btn} onPress={this.reset}>
                    <Text style={styles.btnTxt}>Try again</Text>
                </Pressable>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    title: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.foreground, marginBottom: 8 },
    msg: { fontFamily: fonts.body, fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginBottom: 20 },
    btn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.sm },
    btnTxt: { color: colors.primaryForeground, fontFamily: fonts.displayBold, fontSize: 14 },
});
