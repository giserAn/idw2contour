import { contours as d3_contours } from "d3-contour";
import intersect from "@turf/intersect";

//像素坐标转地理坐标
function polygon_pixel2geos(polygon, gridInfo) {
  //polygon分内环和外环
  const _polygon = polygon.map((ring) => {
    const _ring = ring.map(function (coor) {
      //像素坐标转地理坐标 ，像素坐标y方向从上到下递增，纬度是y从上到下递减
      const lon = gridInfo.xlim[0] + coor[0] * gridInfo.x_resolution;
      let lat;
      //格网自上向下走
      if (gridInfo.y_resolution < 0) lat = gridInfo.ylim[1] + coor[1] * gridInfo.y_resolution;
      //格网自下向上走
      else lat = gridInfo.ylim[0] + coor[1] * gridInfo.y_resolution;

      return [lon, lat];
    });
    return _ring;
  });
  return _polygon;
}

//生成矢量等值面
const createVectorContour = function (gridInfo, breaks) {
  //像素坐标系的等值面
  var _contours = d3_contours().size([gridInfo.n, gridInfo.m]).thresholds(breaks)(gridInfo.grid);
  //像素坐标系换算地理坐标系
  let dataset = {
    type: "FeatureCollection",
    features: [],
  };
  for (let i = 0; i < _contours.length; i++) {
    const contour = _contours[i];
    if (contour.type === "MultiPolygon") {
      contour.coordinates.forEach((polygon) => {
        let geom = {
          type: "Polygon",
          coordinates: [],
        };
        //坐标转换，图形为空去除
        geom.coordinates = polygon_pixel2geos(polygon, gridInfo);
        if (geom.coordinates.length > 0) {
          dataset.features.push({
            type: "Feature",
            properties: {
              value: contour.value,
            },
            geometry: geom,
          });
        }
      });
    } else if (contour.type === "Polygon") {
      let geom = {
        type: "Polygon",
        coordinates: [],
      };
      //坐标转换，图形为空去除
      geom.coordinates = polygon_pixel2geos(contour.coordinates, gridInfo);
      if (geom.coordinates.length > 0) {
        dataset.features.push({
          type: "Feature",
          properties: {
            value: contour.value,
          },
          geometry: geom,
        });
      }
    }
  }
  return dataset;
};

// 获取等值面
const getVectorContour = function (gridInfo, breaks, clip_geom) {
  // 生成等值面
  const vectorContour = createVectorContour(gridInfo, breaks);

  //是否需要切割
  if (clip_geom) {
    const intersectionList = [];
    vectorContour.features.forEach((feature) => {
      const intersection = intersect(feature, clip_geom);
      if (intersection) {
        intersection.properties = feature.properties;
        intersectionList.push(intersection);
      }
    });
    vectorContour.features = intersectionList;
  }

  return vectorContour;
};

export { getVectorContour };
