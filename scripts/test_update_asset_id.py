"""
Tests for update_asset_id.py matching logic.
Run: python -m pytest scripts/test_update_asset_id.py -v
"""

import math
from unittest.mock import MagicMock, patch
import pytest


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in meters between two lat/lon points."""
    from update_asset_id import haversine_distance as hd
    return hd(lat1, lon1, lat2, lon2)


def find_nearest_match(db_row, ass_rows, threshold_m=1000):
    """Find nearest asset row for a DB service point."""
    from update_asset_id import find_nearest_match as fnm
    return fnm(db_row, ass_rows, threshold_m)


def extract_location_code(use_at):
    """Extract leading numeric code from use_at field."""
    from update_asset_id import extract_location_code as elc
    return elc(use_at)


# --- haversine_distance tests ---

class TestHaversineDistance:
    def test_same_point_returns_zero(self):
        assert haversine_distance(16.38, 101.79, 16.38, 101.79) == 0.0

    def test_known_distance(self):
        # ~111km per degree of latitude
        dist = haversine_distance(16.0, 101.0, 17.0, 101.0)
        assert 110_000 < dist < 112_000  # ~111km

    def test_close_points_within_100m(self):
        # ~0.001 degree ≈ 111m
        dist = haversine_distance(16.38, 101.79, 16.381, 101.79)
        assert dist < 150

    def test_returns_float(self):
        result = haversine_distance(16.0, 101.0, 16.1, 101.1)
        assert isinstance(result, float)


# --- extract_location_code tests ---

class TestExtractLocationCode:
    def test_extracts_code_with_leading_zeros(self):
        assert extract_location_code("00000882 โรงเรียนหนองเมยสามัคคี") == "882"

    def test_extracts_code_700(self):
        assert extract_location_code("00000700 โรงเรียนบ้านโนนหนองไฮ") == "700"

    def test_extracts_code_no_leading_zeros(self):
        assert extract_location_code("1234 some location") == "1234"

    def test_returns_none_for_no_number(self):
        assert extract_location_code("โรงเรียน") is None

    def test_returns_none_for_none(self):
        assert extract_location_code(None) is None

    def test_returns_none_for_nan(self):
        assert extract_location_code(float("nan")) is None


# --- find_nearest_match tests ---

class TestFindNearestMatch:
    def setup_method(self):
        self.ass_rows = [
            {"asset_id": 111000001, "lat": 16.381, "lon": 101.796, "use_at": "00000700 school A"},
            {"asset_id": 111000002, "lat": 16.361, "lon": 101.819, "use_at": "00000701 school B"},
            {"asset_id": 111000003, "lat": 15.500, "lon": 101.000, "use_at": "00000900 far away"},
        ]

    def test_finds_exact_match(self):
        db_row = {"lat": 16.381, "lon": 101.796}
        result = find_nearest_match(db_row, self.ass_rows, threshold_m=1000)
        assert result is not None
        assert result["asset_id"] == 111000001

    def test_finds_closest_within_threshold(self):
        db_row = {"lat": 16.382, "lon": 101.797}  # ~150m from row 0
        result = find_nearest_match(db_row, self.ass_rows, threshold_m=1000)
        assert result is not None
        assert result["asset_id"] == 111000001

    def test_returns_none_beyond_threshold(self):
        db_row = {"lat": 14.0, "lon": 100.0}  # very far
        result = find_nearest_match(db_row, self.ass_rows, threshold_m=1000)
        assert result is None

    def test_returns_none_for_null_coords(self):
        db_row = {"lat": None, "lon": None}
        result = find_nearest_match(db_row, self.ass_rows, threshold_m=1000)
        assert result is None

    def test_picks_closest_of_two_candidates(self):
        db_row = {"lat": 16.370, "lon": 101.810}  # between row 0 and row 1
        result = find_nearest_match(db_row, self.ass_rows, threshold_m=5000)
        assert result is not None
        # Should pick the closer one
        assert result["asset_id"] in (111000001, 111000002)

    def test_empty_ass_rows_returns_none(self):
        db_row = {"lat": 16.381, "lon": 101.796}
        result = find_nearest_match(db_row, [], threshold_m=1000)
        assert result is None

    def test_threshold_boundary(self):
        # Row at exactly ~1km away should be excluded at 999m threshold
        db_row = {"lat": 16.381, "lon": 101.796}
        far_row = [{"asset_id": 999, "lat": 16.390, "lon": 101.796, "use_at": "00000999 far"}]
        # ~1km away
        result_tight = find_nearest_match(db_row, far_row, threshold_m=500)
        result_loose = find_nearest_match(db_row, far_row, threshold_m=2000)
        assert result_tight is None
        assert result_loose is not None


# --- extract_village_name tests ---

class TestExtractVillageName:
    def test_extracts_name_from_village_field(self):
        from update_asset_id import extract_village_name
        assert extract_village_name("หมู่ 7 หนองเมย") == "หนองเมย"

    def test_extracts_name_with_ban_prefix(self):
        from update_asset_id import extract_village_name
        assert extract_village_name("หมู่ 3 บ้านฝาย") == "บ้านฝาย"

    def test_extracts_name_with_two_digit_moo(self):
        from update_asset_id import extract_village_name
        assert extract_village_name("หมู่ 17 หนองแต้พัฒนา") == "หนองแต้พัฒนา"

    def test_returns_none_for_none(self):
        from update_asset_id import extract_village_name
        assert extract_village_name(None) is None

    def test_returns_none_for_empty(self):
        from update_asset_id import extract_village_name
        assert extract_village_name("") is None

    def test_returns_original_if_no_moo_pattern(self):
        from update_asset_id import extract_village_name
        result = extract_village_name("โรงเรียนบ้านฝาย")
        assert result == "โรงเรียนบ้านฝาย"


# --- filter_api_results_by_location tests ---

class TestFilterApiResultsByLocation:
    def test_matches_district_and_subdistrict(self):
        from update_asset_id import filter_api_results_by_location
        api_rows = [
            {"asset_id": "111000001", "location_text": "หนองเมย หนองเมย หนองตูม ภูเขียว ชัยภูมิ"},
            {"asset_id": "111000002", "location_text": "หนองเมย หนองเมย อื่นๆ เมืองชัยภูมิ ชัยภูมิ"},
        ]
        result = filter_api_results_by_location(api_rows, district="ภูเขียว", subdistrict="หนองตูม")
        assert len(result) == 1
        assert result[0]["asset_id"] == "111000001"

    def test_matches_district_only_when_no_subdistrict(self):
        from update_asset_id import filter_api_results_by_location
        api_rows = [
            {"asset_id": "111000001", "location_text": "ฝาย ฝาย หนองขาม คอนสวรรค์ ชัยภูมิ"},
            {"asset_id": "111000002", "location_text": "ฝาย ฝาย ตำบลอื่น ภูเขียว ชัยภูมิ"},
        ]
        result = filter_api_results_by_location(api_rows, district="คอนสวรรค์", subdistrict=None)
        assert len(result) == 1
        assert result[0]["asset_id"] == "111000001"

    def test_returns_empty_when_no_district_match(self):
        from update_asset_id import filter_api_results_by_location
        api_rows = [
            {"asset_id": "111000001", "location_text": "ฝาย ฝาย หนองขาม คอนสวรรค์ ชัยภูมิ"},
        ]
        result = filter_api_results_by_location(api_rows, district="เทพสถิต", subdistrict="หนองขาม")
        assert len(result) == 0

    def test_returns_empty_for_empty_input(self):
        from update_asset_id import filter_api_results_by_location
        result = filter_api_results_by_location([], district="ภูเขียว", subdistrict="หนองตูม")
        assert len(result) == 0

    def test_handles_none_location_text(self):
        from update_asset_id import filter_api_results_by_location
        api_rows = [
            {"asset_id": "111000001", "location_text": None},
        ]
        result = filter_api_results_by_location(api_rows, district="ภูเขียว", subdistrict="หนองตูม")
        assert len(result) == 0

    def test_fallback_district_only_when_subdistrict_no_match(self):
        from update_asset_id import filter_api_results_by_location
        api_rows = [
            {"asset_id": "111000001", "location_text": "โนนสะอาด โนนสะอาด หนองคู บ้านแท่น ชัยภูมิ"},
        ]
        # subdistrict doesn't match but district does
        result = filter_api_results_by_location(api_rows, district="บ้านแท่น", subdistrict="ซับใหญ่")
        # Should still return it as fallback (district match)
        assert len(result) == 1


# --- search_asset_api tests (mocked) ---

class TestSearchAssetApi:
    def test_returns_asset_id_on_single_match(self):
        from update_asset_id import search_asset_api
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "total": 1,
            "rows": [{"asset_id": "111000003922", "location_text": "หนองเมย หนองเมย หนองตูม ภูเขียว ชัยภูมิ"}]
        }
        mock_response.raise_for_status = MagicMock()

        with patch("update_asset_id.requests.get", return_value=mock_response):
            result = search_asset_api(
                headers={"Authorization": "Bearer test"},
                search_term="หนองเมย",
                district="ภูเขียว",
                subdistrict="หนองตูม",
            )
        assert result == "111000003922"

    def test_returns_none_when_no_results(self):
        from update_asset_id import search_asset_api
        mock_response = MagicMock()
        mock_response.json.return_value = {"total": 0, "rows": []}
        mock_response.raise_for_status = MagicMock()

        with patch("update_asset_id.requests.get", return_value=mock_response):
            result = search_asset_api(
                headers={"Authorization": "Bearer test"},
                search_term="ไม่มีหมู่บ้านนี้",
                district="ภูเขียว",
                subdistrict="หนองตูม",
            )
        assert result is None

    def test_returns_none_when_district_mismatch(self):
        from update_asset_id import search_asset_api
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "total": 1,
            "rows": [{"asset_id": "111000003922", "location_text": "หนองเมย หนองเมย หนองตูม เมืองชัยภูมิ ชัยภูมิ"}]
        }
        mock_response.raise_for_status = MagicMock()

        with patch("update_asset_id.requests.get", return_value=mock_response):
            result = search_asset_api(
                headers={"Authorization": "Bearer test"},
                search_term="หนองเมย",
                district="ภูเขียว",  # different district
                subdistrict="หนองตูม",
            )
        assert result is None

    def test_picks_first_when_multiple_district_matches(self):
        from update_asset_id import search_asset_api
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "total": 3,
            "rows": [
                {"asset_id": "111000001", "location_text": "หนองเมย หนองเมย หนองตูม ภูเขียว ชัยภูมิ"},
                {"asset_id": "111000002", "location_text": "หนองเมย หนองเมย หนองตูม ภูเขียว ชัยภูมิ"},
                {"asset_id": "111000003", "location_text": "หนองเมย หนองเมย อื่น เมืองชัยภูมิ ชัยภูมิ"},
            ]
        }
        mock_response.raise_for_status = MagicMock()

        with patch("update_asset_id.requests.get", return_value=mock_response):
            result = search_asset_api(
                headers={"Authorization": "Bearer test"},
                search_term="หนองเมย",
                district="ภูเขียว",
                subdistrict="หนองตูม",
            )
        assert result == "111000001"
