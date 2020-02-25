import React, { useState } from 'react';
import { array, arrayOf, bool, func, number, shape, string } from 'prop-types';
import { connect } from 'react-redux';
import { Map as ReactLeafletMap, ZoomControl } from 'react-leaflet';
import ReactLeafletGoogleLayer from 'react-leaflet-google-layer';
import L from 'leaflet';
import Control from 'react-leaflet-control';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { toast } from 'react-toastify';
import noop from 'lodash/noop';
import get from 'lodash/get';

import Button from './Button';
import VectorTileFacilitiesLayer from './VectorTileFacilitiesLayer';
import VectorTileFacilityGridLayer from './VectorTileFacilityGridLayer';
import VectorTileGridLegend from './VectorTileGridLegend';

import { COUNTRY_CODES } from '../util/constants';

import { makeFacilityDetailLink } from '../util/util';

import { facilityDetailsPropType } from '../util/propTypes';

import {
    initialCenter,
    initialZoom,
    detailsZoomLevel,
    minimumZoom,
    maxVectorTileFacilitiesGridZoom,
    GOOGLE_CLIENT_SIDE_API_KEY,
} from '../util/constants.facilitiesMap';

import useUpdateLeafletMapImperatively from '../util/hooks';

const mapComponentStyles = Object.freeze({
    mapContainerStyles: Object.freeze({
        height: '100%',
        width: '100%',
    }),
    copySearchButtonStyle: Object.freeze({
        right: '24px',
        top: '20px',
        fontSize: '12px',
    }),
});

function VectorTileFacilitiesMap({
    resetButtonClickCount,
    clientInfoFetched,
    countryCode,
    handleMarkerClick,
    match: {
        params: { oarID },
    },
    history: {
        push,
    },
    location,
    facilityDetailsData,
    gridColorRamp,
    extent,
}) {
    const mapRef = useUpdateLeafletMapImperatively(resetButtonClickCount, {
        oarID,
        data: facilityDetailsData,
        shouldPanMapToFacilityDetails: get(
            location,
            'state.panMapToFacilityDetails',
            false,
        ),
        isVectorTileMap: true,
        extent,
    });

    const [currentMapZoomLevel, setCurrentMapZoomLevel] = useState(
        oarID ? detailsZoomLevel : initialZoom,
    );

    const handleZoomEnd = (e) => {
        const newMapZoomLevel = get(e, 'target._zoom', null);

        return newMapZoomLevel
            ? setCurrentMapZoomLevel(newMapZoomLevel)
            : noop();
    };

    if (!clientInfoFetched) {
        return null;
    }

    const handleCellClick = (event) => {
        const { xmin, ymin, xmax, ymax, count } = get(event, 'layer.properties', {});
        const leafletMap = get(mapRef, 'current.leafletElement', null);
        if (count && leafletMap) {
            leafletMap.fitBounds([[ymin, xmin], [ymax, xmax]]);
        }
    };

    return (
        <ReactLeafletMap
            id="oar-leaflet-map"
            ref={mapRef}
            center={initialCenter}
            zoom={initialZoom}
            minZoom={minimumZoom}
            renderer={L.canvas()}
            style={mapComponentStyles.mapContainerStyles}
            zoomControl={false}
            maxBounds={[[-90, -180], [90, 180]]}
            worldCopyJump
            onZoomEnd={handleZoomEnd}
        >
            <ReactLeafletGoogleLayer
                googleMapsLoaderConf={{
                    KEY: GOOGLE_CLIENT_SIDE_API_KEY,
                    REGION: countryCode,
                    VERSION: 3.37,
                }}
                type="roadmap"
                continuousWorld
                minZoom={1}
                zIndex={1}
            />
            <Control position="bottomleft">
                <VectorTileGridLegend
                    currentZoomLevel={currentMapZoomLevel}
                    gridColorRamp={gridColorRamp}
                />
            </Control>
            <Control position="topright">
                <CopyToClipboard
                    text={window.location.href}
                    onCopy={() => toast('Copied search to clipboard')}
                >
                    <Button
                        text="Share This Search"
                        onClick={noop}
                        style={mapComponentStyles.copySearchButtonStyle}
                    />
                </CopyToClipboard>
            </Control>
            <ZoomControl position="bottomright" />
            <VectorTileFacilitiesLayer
                handleMarkerClick={handleMarkerClick}
                oarID={oarID}
                pushRoute={push}
                minZoom={maxVectorTileFacilitiesGridZoom + 1}
                maxZoom={22}
            />
            <VectorTileFacilityGridLayer
                handleCellClick={handleCellClick}
                minZoom={1}
                maxZoom={maxVectorTileFacilitiesGridZoom}
                zoomLevel={currentMapZoomLevel}
            />
        </ReactLeafletMap>
    );
}

VectorTileFacilitiesMap.defaultProps = {
    facilityDetailsData: null,
};

VectorTileFacilitiesMap.propTypes = {
    resetButtonClickCount: number.isRequired,
    clientInfoFetched: bool.isRequired,
    countryCode: string.isRequired,
    handleMarkerClick: func.isRequired,
    match: shape({
        params: shape({
            oarID: string,
        }),
    }).isRequired,
    history: shape({
        push: func.isRequired,
    }).isRequired,
    location: shape({
        state: shape({
            panMapToFacilityDetails: bool,
        }),
    }).isRequired,
    facilityDetailsData: facilityDetailsPropType,
    gridColorRamp: arrayOf(array).isRequired,
};

function mapStateToProps({
    ui: {
        facilitiesSidebarTabSearch: { resetButtonClickCount },
    },
    clientInfo: { fetched, countryCode },
    facilities: {
        singleFacility: { data },
        facilities: { data: facilitiesData },
    },
    vectorTileLayer: {
        gridColorRamp,
    },
}) {
    return {
        resetButtonClickCount,
        clientInfoFetched: fetched,
        countryCode: countryCode || COUNTRY_CODES.default,
        facilityDetailsData: data,
        gridColorRamp,
        extent: facilitiesData ? facilitiesData.extent : null,
    };
}

function mapDispatchToProps(_, { history: { push } }) {
    return {
        handleMarkerClick: (e) => {
            const oarID = get(e, 'layer.properties.id', null);

            return oarID ? push(makeFacilityDetailLink(oarID)) : noop();
        },
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(VectorTileFacilitiesMap);
