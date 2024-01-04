import React, {useEffect, useState} from "react";
import {
    borderRadius,
    Container,
    H7,
    H8,
    H9,
    margin,
    padding,
    Insets, Button
} from "@WebologicsIndia/react-native-components";
import HamburgerSVG from "../../../assets/hamburger.svg";
import CurrentLocationSVG from "../../../assets/current-location.svg";
import PlaySVG from "../../../assets/playSVG.svg";
import ReloadSVG from "../../../assets/reloadSVG.svg";
import PauseSVG from "../../../assets/pauseSVG.svg";
import {Image, Pressable, StyleSheet, View, NativeModules, ScrollView} from "react-native";
import {theme} from "../../../config/theme";
import FilterModal from "../../../common/FilterModal";
import DownSvg from "../../../assets/downArrow.svg";
import Geolocation from "react-native-geolocation-service";
import Logo from "../../../assets/dr_company_logo.jpg";
import BatchModal from "../../Home/components/batchModal";
import {fetchWithToken} from "../../../config/helper";
import {batchUrl} from "../../../config/api";

const {RFIDModule} = NativeModules;

const ClientHomeScreen = (props: any) => {
    const [modalData, setModalData] = useState([]);
    const [insets] = useState(Insets.getInsets());
    const [rfIdData, setRfIdData] = useState<Set<any>>(new Set());
    const [rfIdOpen, setRfIdOpen] = useState(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [inventoryModal, setInventoryModal] = useState<boolean>(false);
    const [locationIconColor, setLocationIconColor] = useState(theme.PrimaryDark);
    // const [icon, setIcon] = useState("PlaySVG");
    const [latitude, setLatitude] = useState(0);
    const [longitude, setLongitude] = useState(0);
    const [selectedFilter, setSelectedFilter] = useState<string>("Select Batch Name");
    const [initialized, setInitialized] = useState(false);
    const [active, setActive] = useState(false);
    const [batchesData, setBatchesData] = useState<any>([]);
    const [tagsData, setTagsData] = useState<{ [key: string]: number }>({});
    const [foundData, setFoundData] = useState<any>({});

    useEffect(() => {
        fetchWithToken(`${batchUrl}?status:"Ready"`, "GET").then((resp) => {
            if (resp.status === 200) {
                resp.json().then((data) => {
                    const batchesName = data.results.map((item: any) => item.name);
                    setModalData(batchesName);
                    setBatchesData(data.results);
                });
            }
        });
    }, []);

    const handleLocationIconColor = () => {
        if (locationIconColor === theme.PrimaryDark) {
            Geolocation.getCurrentPosition(
                (position: any) => {
                    setLatitude(position.coords.latitude);
                    setLongitude(position.coords.longitude);
                },
                (error: any) => {
                    console.error(error);
                },

                {enableHighAccuracy: true, timeout: 3600000, maximumAge: 3600000}
            );
            setLocationIconColor("#009900");

        } else {
            setLocationIconColor(theme.PrimaryDark);
        }
    };

    useEffect(() => {
        RFIDModule.init(
            (success: any) => {
                console.log(success);
                setInitialized(true);
            },
            (error: any) => {
                console.log(error);
            }
        );
    }, []);


    const handleIconClick = () => {
        if (!active) {
            RFIDModule.startInventory();
            setActive(true);

        } else {
            RFIDModule.stopInventory(
                (success: any) => {
                    console.log(success);
                    setActive(false);
                },
                (error: any) => {
                    console.log(error);
                }
            );
            setInventoryModal(true);
        }
    };

    const showModal = () => {
        setModalVisible(true);
    };
    const handleRefreshSvg = () => {
        setRfIdData(new Set());
    };

    useEffect(() => {
        let x: string | number | NodeJS.Timeout | undefined;
        if (active) {
            x = setInterval(() => {
                RFIDModule.readTag(
                    (tag: any) => {
                        // console.log("tag", tag);
                        setRfIdData(new Set([...rfIdData, tag]));
                    },
                    (error: any) => {
                        console.log(error);
                    }
                );
            }, 100);
        }
        return () => {
            if (x)
                clearInterval(x);
        };
    }, [active]);
    const findItemByTagId = (tagId: string) => {
        return batchesData.find((item: any) =>
            item.tags.some((tag: any) => tag.tagId === tagId)
        );
    };
    useEffect(() => {
        const newTagsData: { [key: string]: number } = {};
        rfIdData.forEach((tagId) => {
            const foundItem = findItemByTagId(tagId);
            setFoundData(foundItem);
            if (foundItem) {
                foundItem.tags.forEach((tag: any) => {
                    const itemType = tag.itemType;
                    newTagsData[itemType] = (newTagsData[itemType] || 0) + 1;
                });
            }
        });

        setTagsData(newTagsData);
    }, [rfIdData, batchesData]);
    return (
        <>
            <Container
                style={styles.container}
                fluid
                backgroundColor={theme.White}
                header
                addIcon={<Pressable onPress={() => props.navigation.openDrawer()}><HamburgerSVG /></Pressable>}
                headerText={"Tag Scanner"}
                headerTextStyle={styles.headerText}
                headerColor={theme.Primary}
                bottom={insets.bottom * 1.6}
            >
                <View>
                    <View style={{flexDirection: "row", justifyContent: "center"}}>
                        <View style={{flex: 1, justifyContent: "center", alignItems: "center"}}>
                            <Image source={Logo} style={{width: 100, height: 85}} />
                        </View>
                        <Pressable onPress={handleLocationIconColor} style={margin.mt5}>
                            <CurrentLocationSVG color={locationIconColor} width="24" height="24" />
                        </Pressable>
                    </View>
                    <View style={[styles.filterModeView, styles.rowAlignCenter]}>
                        <H8 style={styles.textHeading}>Filter Mode:</H8>
                        <Pressable onPress={showModal} style={[styles.modalOpen, styles.rowAlignCenter]}>
                            <H7 style={{color: theme.PrimaryLight, fontWeight: "500"}}>{selectedFilter}</H7>
                            <DownSvg color={theme.Primary} />
                        </Pressable>
                        <View style={[styles.rowAlignCenter, styles.svgGap]}>
                            {!active ? (
                                <Pressable
                                    onPress={handleIconClick}
                                    disabled={selectedFilter === "Select Batch Name" && selectedFilter !== foundData.name}>
                                    <PlaySVG width="24" height="24" />
                                </Pressable>
                            ) : (
                                <Pressable onPress={handleIconClick}>
                                    <PauseSVG width="24" height="24" />
                                </Pressable>
                            )}
                            <Pressable onPress={handleRefreshSvg}>
                                <ReloadSVG width="24" height="24" />
                            </Pressable>
                        </View>
                    </View>
                    <ScrollView contentContainerStyle={[styles.scrollContent]}>
                        {Object.entries(tagsData).map(([itemType, count], index) => {
                            return (
                                <View key={index}
                                    style={{
                                        flexDirection: "column", ...padding.px5, ...padding.py5, ...borderRadius.br2,
                                        borderColor: theme.PrimaryDark,
                                        borderWidth: StyleSheet.hairlineWidth
                                    }}>
                                    <View style={{flexDirection: "row", alignItems: "center", ...margin.mb1}}>
                                        <H7 style={{color: theme.PrimaryDark, flex: 2, textTransform: "capitalize"}}>
                                            {itemType}
                                        </H7>
                                        <H7 style={{color: theme.PrimaryLight, flex: 1}}>{count}</H7>
                                    </View>
                                    <View style={{flexDirection: "row", alignItems: "center", ...margin.mb1}}>
                                        <H7 style={{color: theme.PrimaryDark, flex: 2, textTransform: "capitalize"}}>
                                            {"Missing Items"}
                                        </H7>
                                        <H7 style={{color: theme.PrimaryDark, flex: 1}}>{"0"}</H7>
                                    </View>
                                    <View style={{flexDirection: "row", alignItems: "center", ...margin.mb1}}>
                                        <H7 style={{color: theme.PrimaryDark, flex: 2, textTransform: "capitalize"}}>
                                            {"UnCategorised Tags"}
                                        </H7>
                                        <H7 style={{color: theme.PrimaryDark, flex: 1}}>{"0"}</H7>
                                    </View>
                                    <View style={[margin.mt4]}>
                                        <Button padding={padding.py3} borderRadius={borderRadius.br3}>
                                            <H7 style={{color: theme.TextLight}}>Received</H7>
                                        </Button>
                                    </View>
                                </View>
                            );
                        })}

                    </ScrollView>
                    {/*      {rfIdData.size > 0 &&*/}
                    {/*<ScrollView contentContainerStyle={[styles.scrollContent]} style={styles.scrollView}>*/}
                    {/*    <H8 style={{color: theme.PrimaryDark}}>Tags</H8>*/}
                    {/*    {Array.from(rfIdData).map((data: any, index: number) => {*/}
                    {/*        return (*/}
                    {/*            <View key={index} style={[padding.py5]}>*/}
                    {/*                <H9 style={{color: theme.PrimaryDark}}>{data}</H9>*/}
                    {/*            </View>*/}
                    {/*        );*/}
                    {/*    })}*/}

                    {/*</ScrollView>*/}
                    {/*      }*/}
                    {/*{*/}
                    {/*    batchesData.tags.length ?*/}
                    {/*        Object.entries(*/}
                    {/*            batchesData.tags.reduce((acc: { [x: string]: any; }, tag: { itemType: string | number; }) => {*/}
                    {/*                acc[tag.itemType] = (acc[tag.itemType] || 0) + 1;*/}
                    {/*                return acc;*/}
                    {/*            }, {})*/}
                    {/*        ).map(([itemType, count], index) => {*/}
                    {/*            console.log("itemType", itemType);*/}
                    {/*            return (*/}
                    {/*                <View*/}
                    {/*                    key={index}*/}
                    {/*                    style={{*/}
                    {/*                        flexDirection: "row",*/}
                    {/*                        justifyContent: "flex-start",*/}
                    {/*                        alignItems: "center",*/}
                    {/*                        ...padding.px5*/}
                    {/*                    }}*/}
                    {/*                >*/}
                    {/*                    <H7 style={{color: theme.PrimaryDark, flex: 1}}>{itemType}</H7>*/}
                    {/*                    <H7 style={{*/}
                    {/*                        color: theme.PrimaryLight,*/}
                    {/*                        flex: 1,*/}
                    {/*                        textTransform: "capitalize"*/}
                    {/*                    }}>{parseInt(count as string)}</H7>*/}
                    {/*                </View>*/}
                    {/*            );*/}
                    {/*        })*/}
                    {/*        : <></>*/}
                    {/*}*/}
                </View>
                <View style={styles.footer}>
                    <View style={[styles.rowAlignCenter, styles.svgGap]}>
                        <H8 style={styles.colorFont500}>Press</H8>
                        <Pressable style={styles.scanButton}><H8 style={styles.scanText}>SCAN</H8></Pressable>
                        <H8 style={styles.colorFont500}>Button</H8>
                    </View>
                    <H9 style={styles.colorFont500}>or Trigger to Read a Tag</H9>
                    <H9 style={styles.colorFont500}>...</H9>
                </View>

            </Container>
            <FilterModal modalVisible={modalVisible} setModalVisible={setModalVisible} setValue={setSelectedFilter}
                modelData={modalData} />
            <FilterModal modalVisible={rfIdOpen} setModalVisible={setRfIdOpen} setValue={setRfIdData}
                modelData={Array.from(rfIdData)} />
            <BatchModal
                modalVisible={inventoryModal}
                setModalVisible={setInventoryModal}
                latitude={latitude}
                longitude={longitude}
                filteredData={rfIdData}
                setRfIdData={setRfIdData}
            />
        </>
    );
};
export default ClientHomeScreen;

const styles = StyleSheet.create({
    container: {
        ...padding.pb5,
        ...padding.px5,
        flex: 1,
        justifyContent: "space-between"
    },
    rowAlignCenter: {
        flexDirection: "row",
        alignItems: "center"
    },
    headerText: {
        fontWeight: "600",
        ...margin.ms4
    },
    bodyLogoView: {
        justifyContent: "space-between"
    },
    logoBody: {
        color: theme.PrimaryDark,
        textAlign: "center",
        flex: 1
    },
    textHeading: {
        color: theme.PrimaryDark,
        fontWeight: "600"
    },
    colorFont500: {
        color: theme.Primary,
        fontWeight: "500"
    },
    filterModeView: {
        ...padding.py3,
        justifyContent: "space-between"
    },
    filterMaskView: {
        gap: 16
    },
    input: {
        borderWidth: 0,
        ...padding.py0
    },
    footer: {
        alignItems: "center",
        gap: 4
    },
    scanText: {
        textAlign: "center",
        color: theme.PrimaryDark,
        fontWeight: "600"
    },
    scanButton: {
        backgroundColor: "#cc6600",
        ...padding.py1,
        ...padding.px5,
        ...borderRadius.br4
    },
    modalOpen: {
        flex: 1,
        justifyContent: "space-between",
        ...margin.ms4,
        ...margin.me5
    },
    svgGap: {
        gap: 10
    },
    // scrollView: {
    // // height: 450
    // },
    scrollContent: {
        flexGrow: 1,
        paddingVertical: 10
    }
});
